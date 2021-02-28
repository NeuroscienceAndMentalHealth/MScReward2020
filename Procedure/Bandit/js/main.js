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
    feedbak_delay: 200,
    feedback_time: 1000,
    n_trials: 200,
    // CSS classes. Elements given these classes are positioned appropriately
    locations: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    // Which bandit goes in which location? e.g. if [3,2,1,0], Bandit
    // 3 is in location 0 (top-left), bandit 2 is in locaiton 1 (top-right), etc.
    permutaton_list: _.shuffle([0, 1, 2, 3])
};

let state = {
    // `width` and `height` get updated every time the window is resized.
    width: null,
    height: null,
    subject_nr: get_subject_nr(),
    trial_nr: 0,
    score: 0,
    t_start_experiment: null,
    t_start_trial: null,
    t_response: null,
    response: null,
    bandit_id: null,
    is_gain: null, // Outcome was gain
    is_loss: null, // or loss (can be both)
    permutation: String(globals.permutaton_list)
};

// This experiment also loads the `probabilities.js` file,
// which hard codes the probability of gains and losses
// for each bandit on each trial.

// When everything's loaded, call the `Ready` function
primate.ready(Ready);

// We break the logic of the task up into individual functions, named
// using CapsCase. Each function either calls the next one
// immmediately, calls it after a delay, or tells the page to wait for
// some user input before triggering the next function.
function Ready(){
    // If you need to do any logic before begining, put it here.
    console.log('Ready!');
    $('#gorilla').children().hide();                // Hide everything we don't want to see yet
    on_resize();                                    // Check window size now
    $( window ).resize(_.debounce(on_resize, 100)); // And every time it changes
    state.t_start_experiment = Date.now();
    $('#gorilla, #start').show();
    $('#more-btn').on('click', MoreInstructions);
};

function MoreInstructions(){
    $('#start').hide();
    $('#start2').show();
    $('#start-btn').on('click', StartTrial);
}

function StartTrial(){
    state.t_start_trial = Date.now();
    $('.options').removeClass('opaque');
    // Reset outcome element (red/green balls)
    globals.locations.map( loc => $('#outcome').removeClass(loc));
    $('#outcome').removeClass('foldered');
    $('#start, #start2, #outcome').hide();
    $('.options, #folder').show();
    $('#boxes, #score').show();
    $('.options').one('click', GetResponse);
};

function GetResponse(e){
    $('.options').off('click');
    let t = state.t_response = Date.now();
    // Which button was clicked?
    let btn = $(e.target);
    if(btn.is('button')==false){
        // Handle cases where inner image was clicked instead
        btn = btn.parent('button');
    }
    let ix = state.response = Number(btn.attr('ix'));
    let loc = globals.locations[ix-1];
    $('#outcome').addClass(loc);
    primate.say('Response: '+ ix);
    // Which bandit does this button correspond to?
    let bandit_id = state.bandit_id = globals.permutaton_list[ix - 1];
    primate.say('Bandit: ' + bandit_id);
    let p_gain = probabilities.gain[bandit_id][state.trial_nr];
    let p_loss = probabilities.loss[bandit_id][state.trial_nr];
    // This shouldn't happen, but throw an informative error if it does
    if((typeof p_gain == 'undefined') | (typeof p_loss == 'undefined')){
        throw 'Probability not defined';
    }
    let is_gain = state.is_gain = flip(p_gain); // flip(p) returns either 1 or 0, wth probability p
    let is_loss = state.is_loss = flip(p_loss);
    // Set Feedback
    let img = get_outcome_stim(is_gain, is_loss);
    if(img == null){
        $('#outcome').hide();
    } else {
        $('#outcome').attr('src', img).show();
    }
    $('.options').addClass('opaque');
    btn.hide();
    setTimeout(ShowFeedback, globals.feedback_delay);
}

function get_outcome_stim(is_gain, is_loss){
    if((is_gain == false) & (is_loss == false)) return null;
    if(is_gain & is_loss) return primate.stimuliURL('both.svg'); // Load appropriate image
    if(is_gain) return primate.stimuliURL('gain.svg');
    if(is_loss) return primate.stimuliURL('loss.svg');
    return(null); // (If neither gain nor loss)
}

function ShowFeedback(){
    $('#outcome').addClass('foldered');
    setTimeout(LogData, globals.feedback_time);
}

function LogData(){
    $('#feedback').hide();
    primate.metric(state);
    state.trial_nr +=1;
    if(state.trial_nr >= globals.n_trials){
        EndExperiment();
    } else {
        StartTrial();
    }
}

function EndExperiment(){
    $('#end').show();
    // Redirect in 3 seconds (if not running on Gorilla)
    setTimeout( primate.finish, 3000);
}

// Old function for randomly generating probabilities (not used)
function random_walk(start=50, duration=150,
                     baseline=50, decay=0.9836,
                     sd=2.8){
    // Parameters from Daw et al (2006)
    // https://static-content.springer.com/esm/art%3A10.1038%2Fnature04766/MediaObjects/41586_2006_BFnature04766_MOESM1_ESM.pdf
    let value = start;
    let values = [];
    for(let i = 0; i < duration; i++){
        let e = random_normal(0, sd);
        values.push(value);
        value = decay * value + (1 - decay) * baseline + e;
    }
    return values;
}
