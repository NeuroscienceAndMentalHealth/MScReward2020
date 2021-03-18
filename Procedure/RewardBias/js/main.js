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

// Takes up to 4s per trial
// 4 * 100 / 60 = 6.66 minutes
const end_url = 'PutProlificURLhereIfRunningStandalone';
let globals = {
    n_trials: 100, // Per block
    n_blocks: 1,
    target_right: null,
    coherence: null,
    ITI: 400,
    fixation_time: 400,
    stimulus_time: 800,
    feedback_time: 800,
    green: '#0f0',
    red: '#f00',
    h_keys: [37, 39], // Left and Right
    v_keys: [38, 45],  // Up and Down
    // Reward regime stuff
    // p_reward: [.25, .75],
    reward_trials: { rich: null, poor: null},
    n_rich_reward: 30, // of 100
    n_poor_reward: 10
};

let state = {
    width: null,
    height: null,
    dpi: null,
    bias_right: null, // Set this below
    subject_nr: get_subject_nr(),
    block_nr: 0,
    trial_nr: 0,
    t_start_experiment: null,
    t_prep_trial: null,
    t_start_trial: null,
    t_response: null,
    loss_block: null,// Default is gain
    target_right: null,
    coherence: null,
    //target_active: null, // From old reward regime
    key: null, // Actual button
    said_right: null, // Response
    accuracy: null,
    rt: null,
    reward: null,
    score: 0,
    // Let's log information about the reward regime
    rich_scheduled: null,
    poor_scheduled: null,
    rich_deferred: 0,
    poor_deferred: 0
};


// When everything's loaded, call the `Ready` function
$( document ).ready(Ready);

// We break the logic of the task up into individual functions, named
// using CapsCase. Each function either calls the next one
// immmediately, calls it after a delay, or tells the page to wait for
// some user input before triggering the next function.

function Ready(){
    // If you need to do any logic before begining, put it here.
    ////console.log('Ready!');
    // Hide everything we don't want to see yet
    primate.populate('#gorilla', 'body', {});
    $('#gorilla').children().hide();
    on_resize();  // Check window size now
    $( window ).resize(_.debounce(on_resize, 100)); // And every time it changes
    setup_key_animation();
    // test_arrows();
    $('#gorilla').show();
    // show_everything();
    state.t_start_experiment = Date.now();
    // Which side should be the rewarded one?
    // I'm not sure we should vary this across participants.
    // For now, try to get the value of the `bias_right` variable (0 or 1)
    // from Gorilla, and if that doesn't work, set it at random.
    let bias_right = primate.manipulation('bias_right', flip());
    state.bias_right = bias_right;
    $('#start, #hand, #ground, .urn, .occluder').show();
    primate.mute();
    bind_to_key(StartBlock, 32);
};

function StartBlock(){
    $('#start, #hand, .resp-btn').hide();
    $('#feedback, #stim-window').hide();
    // Set up reward regime
    let n = globals.n_trials;
    let all_trials = _.shuffle(_.range(0, n));
    let rich_trials = all_trials.slice(0, (n / 2));
    let poor_trials = all_trials.slice((n / 2), n);
    let rich_rewarded = _.sampleSize(rich_trials, globals.n_rich_reward);
    let poor_rewarded = _.sampleSize(poor_trials, globals.n_poor_reward);
    globals.reward_trials.rich = rich_rewarded.sort((a, b) => a > b);
    globals.reward_trials.poor = poor_rewarded.sort((a, b) => a > b);
    // Set up stimulus direction and coherence
    let moving_right_trials = state.bias_right ? rich_trials : poor_trials;
    if(n != 100){ alert('Error: Script assumes 100 trials!'); }
    let coh_left = _.shuffle(repeat([.5, .6, .8], [16, 17, 17] )); // 50 in total
    let coh_right = _.shuffle(repeat([.5, .6, .8], [16, 17, 17] ));
    let target_right = [], coherence = [];
    for(let t of _.range(0, n)){
        if(moving_right_trials.indexOf(t) > -1){
            // This is a rightward trial
            target_right.push(1);
            coherence.push(coh_right.pop());
        } else {
            target_right.push(0);
            coherence.push(coh_left.pop());
        }
    }
    globals.target_right = target_right; // 1 or 0, for each trial
    globals.coherence = coherence;       // Now balanced across directions.
    // Set up visuals
    $('#ball').css('background-color', globals.green);
    if(state.bias_right){
        $('#right_urn').attr('src', primate.stimuliURL('green6.png'));
        $('#left_urn').attr('src', primate.stimuliURL('green2.png'));
    } else {
        $('#right_urn').attr('src', primate.stimuliURL('green2.png'));
        $('#left_urn').attr('src', primate.stimuliURL('green6.png'));
    }
    $('#instructions, .urn, .occluder').show();
    bind_to_key(PrepareTrial, 32);  // 32 = spacebar
}


function PrepareTrial(){
    // Prepare stimuli and show fixation. Complicated!
    $('#instructions, #feedback').hide();
    state.t_prep_trial = Date.now();
    // This syntax is an alternative to using .pop();
    let target_right = state.target_right = globals.target_right[state.trial_nr];
    let coh = state.coherence = globals.coherence[state.trial_nr];
    let dir = target_right ? 0 : Math.PI; // Direction of dot motion (radians). 0 = right
    // console.log([target_right, coh]);
    // Old reward regime code
    // If bias side selected, p_active = .75. Otherwise, p_active = .25
    // let p_active = (state.bias_right == state.target_right) ? .75 : .25;
    // let target_active = state.target_active = flip(p_active);
    // New way
    state.rich_scheduled = globals.reward_trials.rich.indexOf(state.trial_nr) > -1;
    state.poor_scheduled = globals.reward_trials.poor.indexOf(state.trial_nr) > -1;
    //
    // Set up a new random dot kinamatogram
    // Parameters:               el,   n, dir, coh, radius, speed, life
    globals.rdk = new RDK('#target', 100, dir, coh, 4, .5, 500);
    // What colour should the ball be?
    // (Actually grey balls don't fall in this version, so not necessary)
    // let colour = (target_active ? globals.active_colour : 'grey');
    // $('#ball').css('background-color', colour);
    // console.log(`Target right ${target_right}; Active ${target_active}; Coherence ${coh}`);
    reset_stimuli(target_right); // Put everything back where it should be.
    $('#score, .urn, .occluder, #ground').show();
    setTimeout(ShowFixation, globals.ITI);
};

function reset_stimuli(right){
    // Place ball on the right (true) or left (false)
    let x = right ? '60vw' : '40vw';
    $('#ball').css('top', '25vh').css('left', x);
    $('#hand').css('left', '50vw')
        .css('transform', 'translate(-50%, -50%)');
}

function ShowFixation(){
    $('#fix').show();
    setTimeout(ShowCues, globals.fixation_time);
}

function ShowCues(){
    state.t_start_trial = Date.now();
    globals.rdk.start();
    $('#fix').hide();
    $('.target').show();
    setTimeout(WaitResponse, globals.stimulus_time);
}

function WaitResponse(){
    // Hide target, show prompts, wait for response.
    $('.target').hide();
    globals.rdk.end();
    $('#hand, #ball, .resp-btn').show();
    $(document).one('keydown', CheckResponse);
}

function CheckResponse(e){
    let k = (typeof e.which == "number") ? (e.which) : (e.keyCode);
    // console.log(k);
    if (globals.h_keys.indexOf(k) > -1){
        // OK button, figure stuff out.
        let t = state.t_response = Date.now();
        state.key = k;
        state.rt = state.t_response - state.t_start_trial;
        let said_right = state.said_right = Number(k == globals.h_keys[1]);
        let accuracy = state.accuracy = Number(state.target_right == state.said_right);
        let which = (said_right ? '.right' : '.left');
        $(which).addClass('shaking');
        // Calculate Feedback!
        let txt = '', colour;
        let was_rich_side = 1*(state.target_right == state.bias_right);
        let side = was_rich_side ? 'rich' : 'poor';
        let was_scheduled = state[side + '_scheduled'];
        let n_deferred = state[side + '_deferred'];
        let debug_info = {
            rich_scheduled: state.rich_scheduled,
            poor_scheduled: state.poor_scheduled,
            rich_deferred: state.rich_deferred,
            poor_deferred: state.poor_deferred,
            side: side,
            accuracy: state.accuracy
        };
        // console.table(debug_info);
        // console.log('Was reward scheduled?', was_scheduled);
        // console.log('Number of deferred rewards:', n_deferred)
        state.reward = 0; // Unless we change our minds below
        if(state.accuracy){
            // console.log('Correct response');
            if(n_deferred==0){
                // No deferred reward
                if(was_scheduled){
                    state.reward = 1; // Accurate and scheduled
                    // console.log('Delivering scheduled reward');
                } else {
                    // console.log('No reward given');
                }
            } else {
                // Deferred reward fromm previous trial
                state.reward = 1;
                state[side + '_deferred'] -= 1;
                // console.log('Delivering deferred reward');
                // console.log('Decreasing', side + '_deferred', 'to', state[side + '_deferred']);
            }
        } else {
            // console.log('Incorrect');
            // Incorrect
            if(was_scheduled){
                // Defer reward to future
                state[side + '_deferred'] += 1;
                // console.log('Increasing', side + '_deferred', 'to', state[side + '_deferred']);
            }
        }
        if(state.reward) {
            txt = 'Caught it.<br><b>Great!</b>';
            colour = '#0E0';
        } else {
            txt = "Nothing happened.";
            colour = 'black';
        }
        // console.log([state.trial_nr, side, state.accuracy,
        //              was_scheduled, n_deferred, state.reward]);
        $('#feedback').css('color', colour).html(txt);
        state.score += state.reward;
        // Move stuff
        move_hand(said_right);
        if(state.reward){
            setTimeout( () => drop_ball(true), 800);
        };
        setTimeout( ShowFeedback, 1100);
    } else {
        // Wrong button, start listening again.
        $(document).one('keydown', CheckResponse);
    }
}


function move_hand(right){
    let x = right ? '60vw' : '40vw';
    let rot = right ? '30' : '-30';
    let transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    ////console.log(transform);
    $('#hand').css('left', x).css('transform', transform);
}

function drop_ball(caught){
    let y = caught ? '55vh' : '90vh';
    // Distances: y - 25 = [41, 65]
    // Long drop is ~50% longer. .25s * 1.5 = .375s
    // let duration = caught ? '.4s' : '.6s';
    let duration = caught ? '.25s' : '.375s';
    let transition = `top ease-in ${duration}`;
    $('#ball')
        .css('transition', transition)
        .css('top', y);
}


function ShowFeedback(){
    $('#feedback').show();
    setTimeout(LogData, globals.feedback_time);
}


function LogData(){
    $('.stimuli').removeClass('shaking');
    $('#ball, #hand').hide();
    primate.metric(state);
    state.trial_nr +=1;
    if(state.trial_nr >= globals.n_trials){
        state.block_nr +=1;
        if(state.block_nr >= globals.n_blocks){
            End();
        } else {
            state.trial_nr = 0;
            StartBlock();
        }
    } else {
        PrepareTrial();
    }
}

function End(){
    $('#gorilla').children().hide();
    $('#end').show();
    setTimeout( () => primate.finish(end_url), 250);
}


function setup_key_animation(){
    // Whenever f or j keys are pressed, animate corresponding
    // onscreen buttons.
    // Make sure not to call $(document).off('keydown'),
    // or this effect will be removed.
    // Instead, use $(document).one('keydown', callback);
    $(document)
        .on('keydown', function(e){
            let k = ((typeof e.which == "number") ? e.which : e.keyCode);
            if(k==37){ // Left
                $('#btn-left').addClass('active');
            } else if(k == 39){ // Right
                $('#btn-right').addClass('active');
            };
        })
        .on('keyup', function(e){
            $('.resp-btn').removeClass('active');
        });
}

// This Class creates a random dot kinematogram, somewhat similar to
// the ones created by the jsPsych plugin
// https://www.jspsych.org/plugins/jspsych-rdk/ (although the
// implementation is different).
// Usage:
//   let rdk = new RDK('#target', number_of_dots,
//                     direction, coherence,
//                     radius, speed, life);
//   rdk.start();
//
//   rdk.stop(); // (Later)
//   rdk.reset();
function RDK(element, n=100,
             direction=0, coherence=.75, radius=4,
             speed=.5, life=1000){
    let that = this;
    this.el = $(element);
    this.n = n;
    this.direction = direction; // Radians.
    this.coherence = coherence;
    this.r = radius;
    this.speed = speed; // Boxes per second
    this.life = life; // Lifetime in ms
    this.t = null;
    this.live = false;
    this.prepare = function(){
        let width = that.width  = that.el.width();
        let height = that.height = that.el.height();
        let draw = that.draw = SVG(element);
        let n_coherent = n * that.coherence;
        that.data = _.range(1, n).map(function(i) {
            let dir =  (i < n_coherent) ? direction : direction + Math.PI;
            return {index: i,
                    x: _.random(0, 1, 1), // Random starting points
                    y: _.random(0, 1, 1),
                    // Uncomment to make random dots white (useful for debugging)
                    // color: (i < n_coherent) ? '#000' : '#fff',
                    dir: dir,
                    dx: Math.cos(dir),
                    dy: Math.sin(dir),
                    expiry: null
                   };
        });
        that.dots = that.data.map( function(d){
            let c = draw.circle(that.r)
                .fill('black')//.fill(d.color)
                .cx(d.x*that.width)
                .cy(d.y*that.height);
            return(c);
        });
    };
    this.redraw = function(){
        let t = performance.now(),
            dt = t - that.t,
            delta = dt * that.speed/1000;
        _.zipWith(this.data, this.dots, function(dat, dot){
            let x, y;
            if(t > dat.expiry){
                x = _.random(0, 1, 1);
                y = _.random(0, 1, 1);
                dat.expiry += that.life;
            } else {
                x = dat.x + dat.dx * delta;
                x = (x > 1) ? x - 1 : x;
                x = (x < 0) ? x + 1 : x;
            }
            dat.x = x;
            dot.cx(dat.x * that.width);
            // Uncomment for 2D motion
            // dat.y += dat.dy * delta;
            // dot.cy(dat.y * that.height);
        });
        that.t = t;
    };
    this.frame = function(){
        that.redraw();
        if(that.live){
            setTimeout( () => that.anim = window.requestAnimationFrame(that.frame), 10);
        }
    };
    this.start = function(){
        let t = that.t = performance.now();
        that.live = true;
        this.data.map(d => d.expiry = t + Math.random() * that.life);
        that.frame();
    };
    this.stop = function(){
        that.live = false;
    };
    this.delete = function(){
        that.dots.map( d => d.remove() );
    };
    this.end = function(){
        that.stop();
        that.delete();
    };
    this.reset = function(){
        that.stop();
        that.delete();
        that.prepare();
    };
    this.restart = function(){
        that.reset();
        this.start();
    };
    this.prepare();
}


function emulate_responses(side){
    // Manually trigger a keydown event for either left or right arrow
    let k = (side == 'left') ? 37 : 39;
    let e = jQuery.Event("keydown");
    e.which = k;
    // attach this to the window so we can run
    // clearInterval(window['emulation_interval'])
    // to cancel it.
    window['emulation_interval'] = setInterval(function(){
        console.log('Triggering ' + k);
        $(document).trigger(e);
    }, 2000);
}
