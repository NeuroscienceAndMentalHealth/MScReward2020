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
const end_url = 'https://app.prolific.co/submissions/complete?cc=738CFA78';

let globals = {
    resp_keys: [70, 74], // F, J
    offer_keys: [89, 78], // Y, N
    key_is_odd: null, // {70: true, 74: false}
    difficulties: [20, 40, 60, 80],
    n_switches: [1, 2, 3, 4, 5, 6, 7, 8],
    rewards: [1, 2, 3, 4], // Pennies
    difficulty_to_switches: {20: [1, 2], 40: [3, 4], 60: [5, 6], 80: [7, 8]},
    feedback_time: 600,
    final_feedback_time: 1600, // Feedback at end of trial
    fix_time: 800,
    // START HERO STUFF
    // fixation_time: 1000,
    // max_response_time: 1000,
    stim_lag: 200, // Time between response and next stimulus
    // END
    reject_time: 2500,
    iti: 500,
    isi: 100,
    sequence: null,
    target: null,
    stim_nr: null,
    design: null, // Generate later
    digits: [1,2,3,4,5,6,7,8,9], // Might be handy
    n_calibration_reps: 1,
    trial_history: [], // Filled in during calibration phase
    generator: new SequenceGenerator(),
    trial_timeout: null,
    // MORE HERO STUFF
    response_timeout: null,
    animation_timeout: null,
    response_table: {} // Used for animation, reset on every trial
};

let state = {
    // `width` and `height` get updated every time the window is resized.
    width: null,
    height: null,
    subject_nr: get_subject_nr(),
    animation_time: 1000,
    t_start_experiment: null,
    t_start_trial: null,
    t_end_trial: null,
    t_offer: null,
    t_decision: null,
    odd_right: null, // Manipulated between subjects
    phase: null,    // demo, calibration, or main
    n_trials: null, // Depends on the phase
    max_rt: 10e+9,  // Ditto
    trial_nr: 0,
    // score: 0,
    reward: null,
    difficulty: null,
    sequence: null,
    n_switches: null,
    accepted: null,
    stim_times: null,
    response_keys: null,
    response_times: null,
    n_errors: null,
    rt: null
};

let phases = {
    demo: {n_trials: 1},
    calibration: {n_trials: 4},
    // calibration: {n_trials: 32},
    main: {n_trials: 64}
};

// When everything's loaded, call the `Ready` function
primate.ready(Ready);

// We break the logic of the task up into individual functions, named
// using CapsCase. Each function either calls the next one
// immmediately, calls it after a delay, or tells the page to wait for
// some user input before triggering the next function.
// Returns either 0 or 1, and stores next value in data/index.txt

function Ready(){
    // If you need to do any logic before begining, put it here.
    console.log('Ready!');
    $('#gorilla').children().hide();
    // primate.mute();
    // Hide everything we don't want to see yet
    on_resize();  // Check window size now
    $( window ).resize(_.debounce(on_resize, 100)); // And every time it changes
    state.t_start_experiment = Date.now();
    $('#gorilla, #start').show();
    StartExperiment();
    // bind_to_key(StartExperiment, 32);  // 32 = spacebar
    // $('.secret-button').click(StartExperiment); // Also start if they click the text.
};

function StartExperiment(){
    $('#start').show();
    state.odd_right = primate.manipulation('odd_right', flip());
    if(state.odd_right){
        primate.say('Odd right');
        $('#key-odd').text('J');
        $('#key-even').text('F');
        $('#btn-right').text('Odd');
        $('#btn-left').text('Even');
        globals.key_is_odd = {74: true, 70: false};
    } else {
        primate.say('Odd left');
        $('#key-odd').text('F');
        $('#key-even').text('J');
        $('#btn-left').text('Odd');
        $('#btn-right').text('Even');
        globals.key_is_odd = {70: true, 74: false};
    }
    bind_to_key(PrepareDemoPhase, 32);
    // bind_to_key(PrepareCalibrationPhase, 32);
    // simulate_calibration();
    // bind_to_key(PrepareMainPhase, 32);
}

function PrepareDemoPhase(){
    state.phase = 'demo';
    let phase_info = phases[state.phase];
    state.n_trials = phase_info.n_trials;
    state.max_rt = 10e+10;
    setup_key_animation();
    $('#start').hide();
    $('#demo-instructions, .resp-btn, #overlay').show();
    bind_to_key(PrepareTrial, 32);
}


function PrepareCalibrationPhase(){
    state.phase = 'calibration';
    let phase_info = phases[state.phase];
    state.n_trials = phase_info.n_trials;
    // Generate 32 trials (8 n_switches × 4 reps)
    // let n_switch_list = repeat(globals.n_switches, globals.n_calibration_reps);
    // let design = n_switch_list.map( n => ({n_switches: n}) );
    // globals.design = _.shuffle(design);
    // Alternatively, let's just do four practice trials, hard-coded, and see what happens!
    let ns = [2, 4, 6, 8];
    globals.design = ns.map( n => ({n_switches: n}) );
    $('#gorilla').children().hide();
    $('#calibration-instructions, .resp-btn, #overlay').show();
    state.trial_nr = 0;
    bind_to_key(PrepareTrial, 32);
}


function PrepareMainPhase(){
    state.phase = 'main';
    let phase_info = phases[state.phase];
    state.n_trials = phase_info.n_trials;
    // Calculated maximum response time (and implement it below)
    // let hard_trials = globals.trial_history.filter( trial => trial.n_switches > 7);
    // let correct_trials = hard_trials.filter( trial => trial.n_errors < 2 );
    // let rts = correct_trials.map( trial => trial.rt );
    // let max_rt = median(rts) + 500;
    let max_rt = 9e+10;
    // 4 reward levels × 4 difficulty levels × 5 reps = 80 trials
    // Difficulty levels (n switches): 20% (1, 2), 40% (3, 4), 60% (5, 6), 80% (7, 8)
    let design = [];
    globals.rewards.map(
        rw => globals.difficulties.map(
            diff => _.range(5).map(
                i => {
                    let n = _.sample(globals.difficulty_to_switches[diff]);
                    design.push({ reward: rw, difficulty: diff, n_switches: n});
                })));
    globals.design = _.shuffle(design);
    $('#gorilla').children().hide();
    state.trial_nr = 0;
    $('#main-instructions, .resp-btn, #overlay').show();
   bind_to_key(StartOffer, 32);
}


// Trial logic
// These sections are only used in the main phase
function StartOffer(){
    state.t_offer = Date.now();
    let trial_design = globals.design[state.trial_nr];
    console.log(trial_design);
    state.reward = trial_design.reward;
    state.n_switches = trial_design.n_switches;
    state.difficulty = trial_design.difficulty;
    $('#reward-value').text(state.reward);
    $('#difficulty-value').text(state.difficulty);
    $('#round-nr').text(state.trial_nr + 1);
    $('.instructions, #message, #overlay').hide();
    $('#offer-instructions').show();
    $('.resp-btn, .occluder').show();
    $(document).on('keydown', HandleOffer);
}

function HandleOffer(e){
    // 89 = Y, 78 = N
    let k = (typeof e.which == "number" ? e.which : e.keyCode);
    if(globals.offer_keys.includes(k)){
        state.t_decision = Date.now();
        $(document).off('keydown');
        let accepted = state.accepted = Number(k == 89);
        if(accepted){
            PrepareTrial();
        } else {
            RejectOffer();
        }
    }
}

function RejectOffer(){
    $('#offer-instructions').hide();
    $('#offer-reject').show();
    setTimeout(LogData, globals.reject_time - globals.iti);
}

function PrepareTrial(){
    // Prepare stimuli and show fixation
    $('.instructions, #target, #message, #overlay').hide();
    $('body').css('overflow', 'hidden');
    let seq;
    if(state.phase == 'demo'){
        state.n_switches = null;
        seq = [1, 2, 3, 4, 5, 6, 7, 8, 9, 9];
    }  else {
    // if(state.phase == 'calibration'){
        let trial_design = globals.design[state.trial_nr];
        state.n_switches = trial_design.n_switches;
        seq = globals.generator.generate_sequence(state.n_switches);
    }
    globals.stim_nr = 0;
    globals.sequence = _.reverse(seq.slice()); // Reverse so we can use .pop();
    state.sequence = seq;
    state.response_keys = [];
    state.stim_times = [];
    state.response_times = [];
    state.n_errors = 0;
    globals.response_table = {};
    $('.target').css('transition', '');
    $('.target').removeClass('red green left right go');
    $('.pot').children().remove();
    // Trigger CSS reflow. See https://stackoverflow.com/a/16575811/1717077
    let foo = $('.target')[0].offsetHeight;
    // Assign target values
    _.map(seq, (v, i) => $('#tgt'+i).text(v));
    $('#target').hide();
    // Set animation time
    let vert_time = state.animation_time / 1000;
    let hor_time = vert_time / 8;
    $('.target').css('transition',
                     `top ${vert_time}s linear, left ${hor_time}s linear`);
    $(document).off('keydown');
    setup_key_animation();
    $('.resp-btn, .occluder').show();
    if(state.phase == 'main'){
        StartTrial();
    } else {
        $('#message').removeClass('red green')
            .html('Press <code>SPACE</code> to start.').show();
        bind_to_key(StartTrial, 32);
    }
};

function StartTrial(){
    state.t_start_trial = Date.now();
    $('#message').removeClass('red green').html('Get Ready!').show();
    $('.target, .pot').show();
    setTimeout(NextStimulus, globals.fix_time);
};

function NextStimulus(){
    $('#message').hide();
    let t = Date.now();
    let stim = globals.stim_nr;
    globals.target = state.sequence[stim];
    globals.current_key = null;
    console.log('Next: ' + stim);
    if(stim < 10){
        $('#tgt' + stim).addClass('animated go');
        state.stim_times.push(t  - state.t_start_trial);
        console.log('Set Timeout');
        globals.response_timeout = setTimeout(ResponseTimeout,
                                              state.animation_time);
        globals.animation_time = setTimeout(function(){
            feedback_animation(stim);
        }, state.animation_time + 50);
        setTimeout(function(){
            $(document).one('keydown', HandleKey);
        }, 200); // Don't allow response for .2 s
    } else {
        // state.rt = t - state.t_start_trial;
        // Wait for the last stimulus to reach the end
        let dt = t - state.t_start_trial;
        let t_remaining = state.animation_time - (dt - state.stim_times[stim-1]);
        console.log(t_remaining);
        setTimeout(EndTrial, t_remaining + 10);
    }
}

function HandleKey(e){
    console.log('Response');
    let k = (typeof e.which == "number" ? e.which : e.keyCode);
    if(globals.resp_keys.includes(k)){
        console.log('Clear Timeout');
        clearTimeout(globals.response_timeout);
        globals.current_key = k;
        let current_target = $('#tgt'+globals.stim_nr);
        let t = Date.now();
        let said_odd = globals.key_is_odd[k];
        let is_odd = globals.target % 2 == 1;
        let accuracy = said_odd == is_odd;
        console.log([said_odd, is_odd, accuracy]);
        state.response_keys.push(k);
        state.response_times.push(t - state.t_start_trial);
        if(accuracy){
            current_target.addClass('green');
        } else {
            current_target.addClass('red');
            state.n_errors += 1;
        }
        let side = (k == 74 ? 'right' : 'left');
        current_target.addClass(side);
        // Add entry to globals.response_table for animation
        // once the element reaches the bottom
        globals.response_table[globals.stim_nr] = {
            accuracy: accuracy, k: k
        };
        globals.stim_nr += 1;
        setTimeout(NextStimulus, globals.stim_lag);
    } else {
        // Turn key back on.
        $(document).one('keydown', HandleKey);
    }
}

function ResponseTimeout(){
    console.log('Timeout');
    let t = Date.now();
    let current_target = $('#tgt'+state.stim_nr);
    state.response_keys.push('NA');
    state.response_times.push(t - state.t_start_trial);
    current_target.addClass('red');
    state.n_errors += 1;
    // Add entry to globals.response_table for animation
    // once the element reaches the bottom
    globals.response_table[globals.stim_nr] = {
        accuracy: 0, k: null
    };
    globals.stim_nr += 1;
    // Annoyingly, we now have to reset the key events
    $(document).off('keydown');
    setup_key_animation();
    setTimeout(NextStimulus, globals.stim_lag);
}

function feedback_animation(stim_nr){
    // Add feedback element to the appropriate pot at the bottom
    let info = globals.response_table[stim_nr];
    let color = info.accuracy ? 'green' : 'red';
    let pot = (info.k === null ? '#pot-middle' :
               (info.k == globals.resp_keys[0] ? '#pot-left' : '#pot-right'));
    let value = state.sequence[stim_nr];
    let p = $('<p>').addClass(color).text(value).appendTo(pot);
    $('#tgt' + stim_nr).hide();
}

function EndTrial(){
    console.log('EndTrial');
    let t = state.t_end_trial = Date.now();
    state.rt = t - state.t_start_trial;
    $(document).off('keydown');
    $('.target').removeClass('animated');
    // Feedback
    if(state.phase != 'demo'){
        let feedback, colour;
        if(state.n_errors > 1){
            // 0 or 1 errors are OK
            feedback = 'You made too many mistakes on that round, sorry.';
            colour = 'red';
        } else {
            colour = 'green';
            if(state.phase == 'main'){
                feedback = `You won ${state.reward}p.`;
            } else {
                // Calibration phase
                feedback = 'Nice job.';
            }
        }
        let err = state.n_errors;
        let reward = state.reward;
        $('#message').removeClass('red green').text(feedback).addClass(colour).show();
        setTimeout( LogData, globals.final_feedback_time );
        // LogData();
    } else {
        LogData();
    }
}

// function OutOfTime(){
//     // Ran out of time (main phase only)
//     console.log('Time Up!');
//     clearTimeout(globals.trial_timeout);
//     state.t_end_trial = Date.now();
//     state.rt = null;
//     $(document).off('keydown');
//     $('#target').hide();
//     $('#timeout').show();
//     bind_to_key(LogData, 32);
// }

function LogData(){
    $('.instructions, .pot').hide();
    primate.metric(state);
    state.trial_nr +=1;
    if(state.phase == 'demo'){
        // Keep going until no errors
        if(state.n_errors > 0){
            $('#flexible-txt').text("Looks like you made a mistake. Let's try again.");
            $('#flexible-instructions').show();
            bind_to_key(PrepareTrial, 32);
        } else {
            // Move on to next phase
            setTimeout( PrepareCalibrationPhase, globals.iti);
        }
    }
    if(state.phase == 'calibration'){
        //console.log('???Should there be error feedback here???');
        globals.trial_history.push(state);
        if(state.trial_nr >= state.n_trials){
            setTimeout( PrepareMainPhase, globals.iti);
        } else {
            setTimeout( PrepareTrial, globals.iti);
        }
    }
    if(state.phase == 'main'){
        if(state.trial_nr >= state.n_trials){
            setTimeout( EndExperiment, globals.iti);
        } else {
            setTimeout( StartOffer, globals.iti);
        }
    }
}

function EndExperiment(){
    $('#end').show();
    // Redirect in 1 second (if not running on Gorilla)
    setTimeout( e => primate.finish(end_url), 100);
}

// // // // // // // //
// Other functions  ///
// // // // // // // //

function simulate_calibration(rt=5000, ntrials=32){
    // Generate fake calibration history
    globals.trial_history = _.times(ntrials, () => {
        return({n_switches:8, n_errors: 0, rt: rt});
    });
}

function setup_key_animation(){
    // Whenever f or j keys are pressed, animate corresponding onscreen buttons.
    // Make sure not to call $(document).off('keydown'), or this effect will be removed.
    // Instead, use $(document).one('keydown', callback);
    $(document)
        .on('keydown', function(e){
            let k = (typeof e.which == "number") ? e.which : e.keyCode;
            if(k==70){ // f
                $('#btn-left').addClass('active');
            } else if(k == 74){ // j
                $('#btn-right').addClass('active');
            };
        })
        .on('keyup', function(e){
            $('.resp-btn').removeClass('active');
        });
}


function SequenceGenerator(){
    // This function defines a new class, SequenceGenerator,
    // that produces sequences with the desired number of switches.
    // We do it this way to avoid polluting the namespace.
    // Usage:
    // const generator = new SequenceGenerator();
    // let sequence = generator.generate_sequence(5);
    // > Array(9) [ 9, 1, 4, 2, 7, 3, 8, 5, 6 ]
    let generator = this;
    this.switches_to_repetitions = {1: 3, 2: 3, 3: 2, 4: 2, 5: 1, 6: 1, 7: 0, 8: 0};
    this.generate_sequence = function(nswitches){
        if(nswitches > 9 | nswitches < 1 | typeof(nswitches) != 'number'){
            throw(`Error: nswitches must be between 1 and 9, not ${nswitches}`);
        }
        let repetitions = this.switches_to_repetitions[nswitches];
        let template = _.sample(this.template_table[nswitches]);
        return this.sequence_from_template(template, repetitions);
    };
    this.identify_eligable_repetitions = function(template, n_repetitions){
        if(n_repetitions == 0){
            return [];
        }
        // Digits that are repetitions
        let no_switch = delta(template).map(x => x==0);
        // Their indices (of 2nd digit)
        let no_switch_indices = where(no_switch).map( x => x+1 );
        // Don't start with a repetition
        no_switch_indices = no_switch_indices.filter( x => x != 1);
        let possible_combos = get_combinations(no_switch_indices)
            .filter( x => x.length==n_repetitions)    // Right number of reps
            .filter( x => delta(x).indexOf(1) == -1); // No contiguous reps
        if(possible_combos.length > 0){
            return _.sample(possible_combos);
        } else {
            throw(`No eligable sets of ${n_repetitions} repetitions for template ${template}`);
        }
    };
    this.sequence_from_template = function(template, repetitions){
        // Given a template (length 10 array, true for odd numbers, false otherwise),
        // randomly assign actual odd and even numbers, ensuring that we don't repeat
        // a digit twice in a row.
        // `repetitions` is the number of times the same digit should appear in a row.
        let evens = [2,4,6,8],
            odds  = [1,3,5,7,9],
            seq  = [];
        let rep_indices = generator.identify_eligable_repetitions(template, repetitions);
        // console.log(template);
        // console.log(repetitions);
        // console.log(rep_indices);
        for(let i=0; i<10; i++){
            let is_odd = template[i];
            let prev = seq[i-1];
            if(rep_indices.indexOf(i) > -1){
                seq.push(prev);
            } else {
            let is_not_prev = x => x != prev; // (A function)
                let candidates = is_odd ? odds : evens;
                candidates = candidates.filter( x => x != prev );
                seq.push(_.sample(candidates));
            }
        }
        //console.log(seq);
        return seq;
    };
    this.sequence_from_template2 = function(template){
        // Given a template (length 9 array, true for odd numbers, false otherwise),
        // randomly sample odd and even numbers
        let even = _.shuffle([2,4,6,8]),
            odd  = _.shuffle([1,3,5,7,9]);
        var seq = template.map( x => x ? odd.pop() : even.pop());
        return seq;
    };
    this.template_table = {};
    this.init = function(){
        // Build the template table
        const digits = [0,1,2,3,4,5,6,7,8,9];
        // Which values in the sequence should be odd?
        // Start by getting all possible combinations of the digits 0-9 (N = 126)
        let eligable_combinations = get_combinations(digits);//.filter( x => x.length == 5);
        // Expand them out into boolean arrays
        let odd_value_templates = eligable_combinations.map(
            combo => digits.map(d => combo.includes(d)));
        // Build a table from which we can look up sequences with various numbers of switches
        function count_switches(template){
            return _.sum(delta(template).map( x => x != 0));
        }
        digits.map( d => generator.template_table[d] = []);
        odd_value_templates.map(function(template){
            let n = count_switches(template);
            generator.template_table[n].push(template);
        });
    };
    this.init();
}
