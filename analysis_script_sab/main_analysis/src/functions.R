## Functions.R
library(tidyverse)
library(glue)
# Preprocessing


# Plotting
binomial_smooth = function(link='probit', ...){
  geom_smooth(method='glm', method.args = list(family=binomial(link=link)), ...)
}

lgnd = function(x, y){
  theme(legend.position=c(x, y), legend.justification = c(x, y))
}

no_legend = function(){
  theme(legend.position = 'none')
}

mkdir = function(dir){
  dir.create(dir, showWarnings = F, recursive = T)
}

tilt_x_ticks = function(angle=45, vjust=1, hjust=1){
  theme(axis.text.x = element_text(angle=angle, vjust=vjust, hjust=hjust))
}

zeros = function(nrow, ncol){
  matrix(0, nrow, ncol)
}

#' Kalman filter, based on Gershman's code.
#'
#' @param df Dataframe for one subject, with columns
#'    block_nr (block number)
#'    opt_left ('r' or 's'),
#'    opt_right ('r' or 's'),
#'    response ('left' or 'right), and
#'    reward (numeric).
#'   Order is important!
#' @param q_safe Expected variance of the safe option (effectively 0)
#' @param q_risky Expected variance of the risky option
#' @return latents DataFrame with columns
#'   m1 (estimated value of left option),
#'   m2 (estimated value of right),
#'   s1 (posterior variance, or uncertainty, for left), and
#'   s2 (posterior variance for right)
kalman_filter = function(df, q_initial = 100, q_safe = 1, q_risky = 16){
  ## s1 and s2 are variances, not SDs.
  N = nrow(df)
  Q = zeros(N, 2) + q_safe
  # Initial gains
  stopifnot(df$opt_left %in% c('r', 's'))
  Q[df$opt_left == 'r', 1] = q_risky
  Q[df$opt_right == 'r', 2] = q_risky

  M = zeros(N, 2)
  S = zeros(N, 2)

  chose_right = ifelse(df$response == 'right', 2, 1)

  for(i in 1:N){
    # initialization at the start of each block
    if(i == 1 || (df$block_nr[i] != df$block_nr[i-1])){
      m = c(0, 0);      # posterior mean
      s = c(q_initial, q_initial);  # posterior variance
    }

    choice = chose_right[i]
    reward = df$reward[i]

    # store latents
    M[i,] = m
    S[i,] = s

    # update
    k = s[choice] / (s[choice] + Q[i, choice])    # Kalman gain
    err = reward - m[choice];            # prediction error
    m[choice] = m[choice] + k*err;       # posterior mean
    s[choice] = s[choice] - k*s[choice];      # posterior variance
  }
  latents = data.frame(
    m1 = M[,1], m2 = M[,2],
    s1= S[,1], s2 = S[,2]) %>%
    mutate(kalman_value_difference = m2 - m1,
           kalman_sigma_difference = s2 - s1,
           kalman_total_uncertainty = sqrt(s1 + s2),
           kalman_weighted_value_difference = kalman_value_difference / kalman_total_uncertainty)
  return(latents)
}

plot_kalman_block = function(block_df){
  block_latents = block_df %>%
    select(trial_nr, m1, m2, s1, s2, opt_left, opt_right) %>%
    pivot_longer(c(m1, m2, s1, s2),
                 names_to = c(".value", ".option"),
                 names_pattern = "(.)(.)") %>%
    mutate(
      option = ifelse(.option == '1',
                      paste0('Left (', opt_left, ')'),
                      paste0('Right (', opt_right, ')'))
    ) %>%
    rename(mu = m) %>%
    mutate(sigma = sqrt(s))

  block_df = block_df %>%
    mutate(
      option = ifelse(response == 'left',
                      paste0('Left (', opt_left, ')'),
                      paste0('Right (', opt_right, ')')))

  ggplot(block_latents, aes(trial_nr, mu,
                            color = option,
                            fill = option)) +
    geom_ribbon(alpha = .5,
                mapping = aes(ymin = mu-sigma, ymax = mu+sigma)) +
    geom_path(size = 1) +
    geom_label(data=filter(block_df, response=='left'),
              mapping = aes(x = trial_nr + .5,
                            label = reward),
              y = 11, size = 5, fill = NA) +
    geom_label(data=filter(block_df, response=='right'),
              mapping = aes(x = trial_nr + .5,
                            label = reward),
              y = 11, size = 5, fill = NA) +
    coord_cartesian(ylim=c(-12, 12)) +
    scale_x_continuous(breaks=1:10, limits = c(0, 11), expand=c(0, 0)) +
    geom_hline(linetype='dashed', yintercept=0) +
    labs(x='Trial', y='Value Estimate (±SE)', color='Option', fill='Option') +
    lgnd(.95, .05) +
    theme(panel.grid.major.x = element_line())
}

# # original_df = df
# latent1 = kalman_filter(df, q_safe = 1)
# plot_df = cbind(df, latent)
# plot_kalman_block(plot_df)
# 
# df = original_df
# latent2 = kalman_filter(df, q_safe = .001)
# plot_df = cbind(df, latent)
# plot_kalman_block(plot_df)


