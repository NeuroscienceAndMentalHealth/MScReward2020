"use strict";

// static/main.js
// The main logic for our task.

// We follow a rule of only creating two global variables.

// `globals` is an object containing any information we want to make
// gloabally available in the task. `state` is an object containing
// information that is globally available, AND which will be sent to
// the server at the end of each trial;

// We populate both with default values now, so we can know at a
// glance what values they can store. This is better than adding new
// values on an ad-hoc basis, which often leads to bugs.

let globals = {
    feedback_time: 600,
    n_trials: 10,
    n_blocks: 30,
    n_per_condition: {ss: 6, sr: 8, rs: 8, rr: 8},
    design: null, // Created later
    block_sd: 100,
    trial_sd: 16,
    labels : {'r' : 'Risky', 's' : 'Safe'},
    current_values: {
        'left': 0, 'right': 0
    },
    block_score: 0,
    end_url: null
};

let state = {
    // `width` and `height` get updated every time the window is resized.
    width: null,
    height: null,
    subject_nr: get_subject_nr(),
    block_nr: 0,
    trial_nr: 0,
    t_start_experiment: null,
    t_start_block: null,
    t_start_trial: null,
    t_response: null,
    opt_left: null, // Safe or risky
    opt_right: null,
    value_left: null, // Mean value
    value_right: null,
    response: null,
    reward: null,
    rt: null
};


// Design // // (s = Safe, r = Risky) //
// In the original Gershman version, buttons were randomly set to be safe
// or risky at the start of each block. I would rather a fixed number of SS, SR, and RR blocks.

// If we're using a fixed design, use this as a template
const fixed_design = [
    {opt_left: 'r', opt_right: 's', val_left: 0, val_right: 0},
    {opt_left: 'r', opt_right: 's', val_left: 0, val_right: 0},
    {opt_left: 'r', opt_right: 's', val_left: 0, val_right: 0},
    {opt_left: 'r', opt_right: 's', val_left: 0, val_right: 0}
];

// Otherwise, just set up a list of conditions now, then sample
// the actual values at the start of each block.
function generate_design(){
    let conditions = [{opt_left:'s',  opt_right:'s'},
                      {opt_left:'s',  opt_right:'r'},
                      {opt_left: 'r', opt_right:'s'},
                      {opt_left: 'r', opt_right:'r'}];
    let n = globals.n_per_condition;
    conditions = repeat(conditions, [n.ss, n.sr, n.rs, n.rr]);
    conditions = _.shuffle(conditions);
    return(conditions);
}

// When everything's loaded, call the `Ready` function
primate.ready(Ready);

// We break the logic of the task up into individual functions, named
// using CapsCase. Each function either calls the next one
// immmediately, calls it after a delay, or tells the page to wait for
// some user input before triggering the next function.
function Ready(){
    // If you need to do any logic before begining, put it here.
    console.log('Ready!');
    // Hide everything we don't want to see yet
    $('#gorilla').children().hide();
    on_resize();  // Check window size now
    $( window ).resize(_.debounce(on_resize, 100)); // And every time it changes
    globals.design = generate_design();
    $('#gorilla').show();
    state.t_start_experiment = Date.now();
    // Get the manipulation if running on Gorilla. Flip a coin otherwise.
    $('#start').show();
    $('#start-btn').one('click', PrepareBlock);
 };

function get_colour(){
    // We're using the randomColor JavaScript package
    return randomColor({
        luminosity: 'dark'
    });
}
function PrepareBlock(){
    globals.block_score = 0;
    let block_design = globals.design.pop();
    state.opt_left = block_design.opt_left;
    state.opt_right = block_design.opt_right;
    // state.opt_left = flip() ? 'r' : 's';
    // state.opt_right = flip() ? 'r' : 's';
    state.value_left = random_normal(0, globals.block_sd);
    state.value_right = random_normal(0, globals.block_sd);
    $('#left-btn' ).text(globals.labels[state.opt_left])
        .css('background-color', get_colour());
    $('#right-btn').text(globals.labels[state.opt_right])
        .css('background-color', get_colour());
    $('#start, #break').hide();
    state.t_start_block = Date.now();
    $('#stimuli').show();
    StartTrial();
}

function StartTrial(){
    console.log('StartTrial');
    $('.feedback, #next-btn').hide();
    $('.option').removeClass('fade').show();
    // Set bandit values
    ['left', 'right'].map( side => {
        let mean = state['value_' + side];
        let sd = (state['opt_' + side] == 'r') ? globals.trial_sd : 0;
        let v = random_normal(mean, sd);
        v = Math.round(v, 0);
        let sign = v < 0 ? '' : '+';
        $(`#${side}-feedback`).text(sign + v);
        globals.current_values[side] = v;
    });
    state.t_start_trial = Date.now();
    $('.option').one('click', CheckResponse);
}

function CheckResponse(e){
    console.log('CheckResponse');
    let t = state.t_response = Date.now();
    let id = $(e.target).attr('id');
    let response = state.response = id.replace('-btn', '');
    $('.option').not('#' + id).addClass('fade');
    $('#' + response + '-feedback').show();
    state.rt = state.t_response - state.t_start_trial;
    let reward = state.reward = globals.current_values[response];
    globals.block_score += reward;
    $('.option').off('click');
    LogData();
}

function LogData(){
    primate.metric(state);
    state.trial_nr +=1;
    if(state.trial_nr >= globals.n_trials){
        EndBlock();
    } else {
        $('#next-btn').show().one('click', StartTrial);
        // Uncomment to automatically start next trial instead (probably not good)
        // setTimeout(StartTrial, globals.feedback_time);
    }
}

function EndBlock(){
    state.block_nr += 1;
    state.trial_nr = 0;
    $('.last-score').text(globals.block_score);
    if(state.block_nr < globals.n_blocks){
        $('#break').show();
        $('#which-game').text((state.block_nr + 1));
        $('#stimuli').hide();
        $('#resume-btn').one('click', PrepareBlock);
    } else {
        EndExperiment();
    }
}

function EndExperiment(){
    $('#stimuli').hide();
    $('#end').show();
    // Redirect in 3 seconds (if not running on Gorilla)
    setTimeout( e => primate.finish(globals.end_url), 3000);
}
