// static/main.js
// The main logic for our task.
"use strict";

// We follow a rule of only creating two global variables.

// `globals` is an object containing any information we want to make
// gloabally available in the task. `state` is an object containing
// information that is globally available, AND which will be sent to
// the server every time we call LogData();

// We populate both with default values now, so we can know at a
// glance what values they can store. This is better than adding new
// values on an ad-hoc basis, which often leads to bugs.
const end_url = 'https://app.prolific.co/submissions/complete?cc=738CFA78';
let globals = {
    trials_per_block: 40,
    n_blocks: 4,
    conditions: _.shuffle(['CEV', 'DEV', 'IEV', 'CEVR']),
    colours: _.shuffle(['red', 'green', 'blue', 'pink']),
    rotation_time: 5000,
    fixation_time: 0,
    feedback_time: 500,
    timeout_time: 2500, // How long to wait on timeout
    timeout_text: "Too slow! <br> Please respond before the clock goes the whole way around.",
    anim_frame: null
};

let state = {
    // `width` and `height` get updated every time the window is resized.
    width: null,
    height: null,
    subject_nr: get_subject_nr(),
    block_nr: 0,
    condition: null,
    colour: null,
    trial_nr: 0,
    score: 0,
    outcome: null,
    t_start_experiment: null,
    t_start_trial: null,
    t_response: null,
    rt: null
};

// When everything's loaded, call the `Ready` function
$( document ).ready(Ready);

// We break the logic of the task up into individual functions, named
// using CapsCase. Each function either calls the next one
// immmediately, calls it after a delay, or tells the page to wait for
// some user input before triggering the next function.

function Ready(){
    // If you need to do any logic before begining, put it here.
    console.log('Ready!');
    primate.populate('#gorilla', 'body');
    // Hide everything we don't want to see yet
    $('#gorilla').children().hide();
    on_resize_custom();  // Check window size now
    $( window ).resize(_.debounce(on_resize_custom, 100)); // And every time it changes
    $('#gorilla').show();
    state.t_start_experiment = Date.now();
    $('#start').show();
    bind_to_key(StartBlock, 32);  // 32 = spacebar
};

function StartBlock(){
    $('#start, #score, #prompt').hide();
    state.condition = globals.conditions[state.block_nr];
    let c = state.colour = globals.colours[state.block_nr];
    $('#block-colour').css('color', c).text(c);
    $('#circle').css('background-color', c);
    $('#start-block').show();
    bind_to_key(PrepareTrial, 32);
}

function PrepareTrial(){
    // Prepare stimuli and show fixation
    bind_to_key(Pass); // Remove previous key binding
    $('#feedback').hide();
    $('#feedback, #prompt, #start-block').hide();
    set_to_angle(0);
    $('#clock, #score').show();
    // state.name = globals.names[state.trial_nr];
    // $('#name').html(state.name);
    // $('#fix').show()
    // Wait, then start trial
    setTimeout(StartTrial, globals.fixation_time);
};

function StartTrial(){
    // $('#fix').hide()
    state.t_start_trial = Date.now();
    state.rt = null;
    bind_to_key(Respond, 32);
    // Efficient way
    // $('#hand').addClass('spinning');
    // Smooth way
    window.cancelAnimationFrame(globals.anim_frame);
    globals.anim_frame = window.requestAnimationFrame(tick);
};

function tick(){
    // Smooth but expensive animation option
    let t = Date.now();
    let elapsed = t - state.t_start_trial;
    if(elapsed > globals.rotation_time){
        StopClock();
        // ...
    } else {
        // $('#feedback').html(_.round(elapsed/1000, 2))
        let angle = 360 * (elapsed / globals.rotation_time);
        set_to_angle(angle);
        globals.anim_frame = window.requestAnimationFrame(tick);
        // Debug
        // let rwd = compute_reward(elapsed, state.condition);
        // let p = _.round(rwd.prob, 2);
        // let pv = _.round(rwd.value * rwd.prob)
        // let txt = `V=${rwd.value}<br>P=${p}<br>EV=${pv}`
        // $('#feedback').html(txt)
        // set_to_angle(angle, true);
    }
}

function Respond(e){
    let t = state.t_response = Date.now();
    bind_to_key(Pass, 32); // Remove previous key binding
    let elapsed = t - state.t_start_trial;
    if (elapsed < globals.rotation_time){
        state.rt = elapsed;
        let angle = 360 * (elapsed / globals.rotation_time);
        let rwd = state.outcome = get_reward(elapsed, state.condition);
        state.score += rwd;
        $('#score-points').text(state.score);
        set_to_angle(angle, true);
        rwd = (rwd > 0) ? `+${rwd}` : '<b>✗</b>';
        $('#feedback').html(rwd).show();
        // $('#hand').removeClass('spinning');
        // window.cancelAnimationFrame(globals.anim_frame);
        // setTimeout(LogData, globals.feedback_time);
    } else {
        // Timeout
        StopClock();
        // $('#clock').hide();
        // $('#prompt').html(globals.timeout_text).show();
        // setTimeout(LogData, globals.timeout_time);
    }
};

function StopClock(){
    window.cancelAnimationFrame(globals.anim_frame);
    if(state.rt === null){
        // Timeout
        $('#clock').hide();
        $('#prompt').html(globals.timeout_text).show();
        setTimeout(LogData, globals.timeout_time);
    } else {
        $('#hand').removeClass('spinning');
        setTimeout(LogData, globals.feedback_time);
    }
}

function ShowOutcome(){

}

// function GetResponse(e){
//     // Check which button was pressed and when
//     let k = (typeof e.which == "number") ? e.which : e.keyCode;
//     let t = state.t_response = Date.now();
//     $('#prompt').hide();
//     state.response = k;
//     state.rt = state.t_response - state.t_start_trial;
//     LogData();
// }

function LogData(){
    // For now, just log to the console.
    $('#clock, #feedback').hide();
    primate.metric(state);
    state.trial_nr +=1;
    if(state.trial_nr >= globals.trials_per_block){
        // End block
        state.block_nr += 1;
        if(state.block_nr >= globals.n_blocks){
            // End experiment
            $('#end').show();
            setTimeout( () => primate.finish(end_url), 1000);
        } else {
            // Next block
            state.trial_nr = 0;
            StartBlock();
        }
    } else {
        // Next trial
        PrepareTrial();
    }
}

// Specific utilities for this experiment
function deg_to_rad(degrees){
    return(degrees * (Math.PI/180));
}

function set_to_angle(degrees, feedback){
    // Put the clock hand and feedback at the
    // appropriate angle.
    let fb = feedback || false;
    let deg = `rotate(${degrees}deg)`;
    $('#hand')
        .css('-moz-transform', deg)
        .css('-webkit-transform', deg)
        .css('transform', deg);
    if(fb){
        // Place feedback text
        let radius = .2 * state.height;
        let theta = deg_to_rad(degrees);
        let dx = Math.sin(theta) * radius;
        let dy = Math.cos(theta) * -radius;
        let x = state.width/2 + dx;
        let y = state.height/2 + dy;
        $('#feedback').css('left', x).css('top', y);
    }
};


function compute_reward(rt, condition){
    // P(Reward) and V(Reward) depend on condition and RT.

    // I'm porting these functions from MATLAB, without fully
    // understanding how they work. They need to be tested.
    const k = 37,
          shift = 700,
          rt_extended = 7000,
          dev_factor = 10,
          dev_factor2= 1,
          sin_factor = 0.25;
    let value, prob;
    if (condition=='CEV'){
        // magnitude increases while frequency decreases.
        value = (k*rt_extended)/(rt_extended-(rt+shift));
        prob = 1-((rt+shift)/rt_extended);
    } else if (condition=='DEV'){
        // magnitude increases while frequency decreases.
        value = dev_factor * Math.log(dev_factor2 * (rt + shift));
        let cev_x = 1-((rt+shift)/rt_extended);
        let iev_x = cev_x + (cev_x*(sin_factor*Math.sin((rt*Math.PI)/5000)));
        prob = (2*cev_x)-iev_x;
    } else if (condition=='IEV'){
        // magnitude increases while frequency decreases.
        let cev_x = (k*rt_extended)/(rt_extended-(rt+shift));
        let dev_x = dev_factor * Math.log(dev_factor2*(rt+shift));
        value = (2*cev_x)-(dev_x);
        let cev_x2 = 1-((rt+shift)/rt_extended);
        prob = cev_x2 + (cev_x2*(sin_factor*Math.sin((rt*Math.PI)/5000)));
    } else if (condition == 'CEVR'){
        // magnitude decreases while frequency increases.
        value = 1-((rt+shift)/rt_extended);
        value = value*200;
        prob = (k*rt_extended)/(rt_extended-(rt+shift)) ;
        prob = prob/200;
    }
    return({'value': Math.round(value),
            'prob': prob});
}

function get_reward(rt, condition){
    let rwd = compute_reward(rt, condition);
    if(flip(rwd.prob)){
        // Add noise between [-5, +5]
        return(rwd.value + _.sample(_.range(-5, 6)));
    } else {
        return(0);
    }
}


// We do special things when the window is resized in this experiment.
function on_resize_custom(){
    let w = state.width =  $( window ).width();
    let h = state.height =  $( window ).height();
    // Get left edge of clock face
    let x = (.5 * w) - (.15 * h);
    $('#clock').css('left', x);
};


// Some code for testing the rewards are being calculated correctly
function test_condition_reward(condition){
    let rts =  _.range(0, 5000, 100);
    let rows = rts.map( function(rt){
        let rw = compute_reward(rt, condition);
        rw.rt = rt;
        rw.condition = condition;
        return(rw);
    });
    return(rows);
}


function test_reward(){
    let conditions = globals.conditions;
    let chunks = conditions.map(test_condition_reward);
    let rows = _.flatten(chunks);
    let result = to_csv(rows);
    // download_file(result, 'design.csv');
    return(result);
}

function test_randomiser(){
    // Not implemented!
}

let comma_sep = (a,b) => a+','+b;
let line_sep = (a,b) => a+'\n'+b;
function to_csv(list_of_objects, rownames=true){
    // Requires that names are the same in all objects
    let headers = Object.keys(list_of_objects[1]);
    let contents = list_of_objects.map(function(obj){
        let vals = headers.map(v => obj[v]);
        return(_.reduce(vals, comma_sep));
    });
    let rows = _.reduce(contents, line_sep);
    if(rownames){
        let head = _.reduce(headers, comma_sep);
        return(head + '\n' + rows);
    } else {
        return(rows);
    }
}

// function test_condition_reward_txt(condition){
//     let rts = _.range(1, 5000);
//     let rows = rts.map( function(rt){
//         let rw = compute_reward(rt, condition);
//         let row = rt + ',' + condition + ',' + rw.value + ',' + rw.prob;
//         return(row);
//     });
//     return(_.reduce(rows, (a,b) => a+'\n'+b));
// }
