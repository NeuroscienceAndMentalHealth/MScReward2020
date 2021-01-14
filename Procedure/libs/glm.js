// const _ = require('lodash');

let glm = function(){
    // Utils
    function sigmoid(x){
        return 1 / (1 + Math.exp(-x));
    }

    function transpose(X){
        // Turn an (i × j) list into a (j \xx i) one
        return X[0].map((x,i) => X.map(x => x[i]));
    }

    function coin_toss(probability){
        let out = (Math.random() < probility ? 1 : 0);
        return out;
    }
    const sum = (a, b) =>  a + b;
    const product = (a, b) =>  a * b;

    // Logistic regression
    function logistic_prediction(Xs, betas, scale='probability'){
        // Xs: List of columns, e.g. [[1,1,1], [1,2,3]]
        // betas: List of weights, e.g. [b0, b1]
        // scale: 'probability' or 'logit'
        let Xt = transpose(Xs);
        let pred = Xt.map( function(row_X){
            return _.sum(_.zipWith(row_X, betas, product));
        });
        if(scale=='probability') pred = pred.map(sigmoid);
        return pred;
    }

    function logistic_loglik(Xs, y, betas){
        // Xs: List of columns, e.g. [[1,1,1], [1,2,3]]
        // y: Outcome column, e.g. [0, 1, 0]
        // betas: List of weights, e.g. [b0, b1]
        let Xt = transpose(Xs);
        let logliks = _.zipWith(Xt, y, function(row_X, row_y) {
            let mu = _.sum(_.zipWith(row_X, betas, product));
            let yhat = sigmoid(mu);
            let loglik = row_y == 1 ? Math.log(yhat) : Math.log(1 - yhat);
            // console.log([row_y, yhat, loglik]);
            return loglik;
        });
        return _.sum(logliks);
    }

    function fit_logistic(Xs, y,
                          method='ml', lambda=null,
                          opts={}){
        // Xs: List of columns, e.g. [[1,1,1], [1,2,3]]
        // y: Outcome column, e.g. [0, 1, 0]
        // method: 'ml', 'lasserto', or 'ridge'
        // lambda: penalty weights for each predictor (is method is 'lasso' or 'ridge')
        //         Can be either single value, or list matching number of predictors
        // opts: Dictionary of optional options: {epochs: 200000, rate: .01, tol: 1e-6}
        let betas = new Array(Xs.length).fill(0);
        let Xt = transpose(Xs);
        let epochs = opts.epochs || 200000,
            rate = opts.rate || .01,
            tol = opts.tol || 1e-6;
        let iter, loss, last_loss = -9e9;
        if(method != 'ml'){
            if(typeof(lambda) == 'number'){
                lambda = new Array(Xs.length).fill(lambda);
            } else {
                assert(lambda.length == Xs.length);
            }
        }
        for (iter=0; iter<epochs; iter++){
            _.zipWith(Xt, y, function(row_X, row_y) {
                let mu = _.sum(_.zipWith(row_X, betas, product));
                let yhat = sigmoid(mu);
                let error = yhat - row_y;
                let delta = row_X.map( x => -error * x);
                if(method=='lasso'){
                    delta = _.zipWith(delta, lambda, betas,
                                      (d, l, b) => d - (l * Math.sign(b)) );
                } else if (method=='ridge') {
                    delta = _.zipWith(delta, lambda, betas,
                                      (d, l, b) => d - (2 * l * b) );
                };
                // console.log(delta);
                betas = _.zipWith(betas, delta, (b, d) => b + (d * rate));
            });
            loss = logistic_loglik(Xs, y, betas);
            if(method == 'lasso') {
                loss += _.sum(_.zipWith(lambda, betas, (l, b) => l * Math.abs(b)));
            }
            if(method == 'ridge') {
                loss += _.sum(_.zipWith(lambda, betas, (l, b) => l * (b**2) ));
            }
            // console.log('Beta:', betas, ', Loss:', loss);
            if(Math.abs(loss - last_loss) < tol) break;
            last_loss = loss;
        }
        return {betas: betas, iter: iter, loss: loss};
    };

    return {
        fit_logistic: fit_logistic
    };
}();
