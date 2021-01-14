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
    resp_keys: [37, 39], // Left, Right
    feedback_time: 1250,
    design: null, // Generate later (see //Design// section in code below)
    n_trials: null // Get from design
};

let state = {
    // `width` and `height` get updated every time the window is resized.
    width: null,
    height: null,
    subject_nr: get_subject_nr(),
    trial_nr: 0,
    t_start_experiment: null,
    t_start_trial: null,
    t_response: null,
    safe_is_right: null,
    type: null, // 'mixed', 'gain', or 'loss'
    // Gamble parameters
    risky_gain: null,
    risky_loss: null,
    safe: null,
    // Response details
    response: null,
    chose_right: null,
    chose_risky: null,
    medium: null,
    outcome: null,
    reward: null,
    rt: null
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
    primate.mute();
    // Hide everything we don't want to see yet
    $('#gorilla').children().hide();
    // See definition of `on_resize_custom()` below.
    on_resize_custom();  // Check window size now
    $( window ).resize(_.debounce(on_resize_custom, 100)); // And every time it changes
    // Generate design
    globals.design = build_design();
    globals.n_trials = globals.design.length;
    $('#n_trials').text(globals.n_trials);
    state.t_start_experiment = Date.now();
    $('#gorilla, #start').show();
    bind_to_key(StartExperiment, 32);  // 32 = spacebar
    // Also start if they click the text
    // (useful for piloting on mobile)
    $('.secret-button').click(StartExperiment);
};

function StartExperiment(){
    $('#start, #break').hide();
    $('#hand, #folder').show();
    setTimeout(PrepareTrial, 1000);
}

function PrepareTrial(){
    // Prepare stimuli and show fixation
    $('#start, #break').hide();
    $('body').css('overflow', 'hidden'); // Prevent window from scrolling
    $('#hand')
        .css('left', '50vw')
        .css('transform', 'translate(-50%, -50%)');
    $('.card').remove();
    state.safe_is_right = flip(); // Randomly returns 1 or 0
    let design = globals.design.pop();
    state.risky_gain = design.gain;
    state.risky_loss = design.loss;
    state.safe = design.safe;
    state.type = design.type;
    let risky_id, safe_id;
    if(state.safe_is_right){
        risky_id = 'left-card';
        safe_id = 'right-card';
    } else {
        risky_id = 'right-card';
        safe_id = 'left-card';
    }
    // On every trial, we use 'generate_risky_card()` and `generate_safe_card()`
    // to create new HTML elements for the option cards, with the appropriate
    // values, and append them to the page.
    // Above, we deleted the old cards with `$('.card').remove();`
    $('#gorilla').append(
        generate_risky_card(state.risky_gain, state.risky_loss, risky_id));
    $('#gorilla').append(generate_safe_card(state.safe, safe_id));
    on_resize_custom();
    StartTrial();
};

function StartTrial(){
    // Show targets, note time, and bind next stage to the spacebar
    $('#left-gamble, #right-gamble, #hand, .quant, #folder').show();
    state.t_start_trial = Date.now();
    // Handle both keypresses and clicks
    $(document).off('keydown').on('keydown', CheckKeys);
    $('.gamble').on('click', ProcessClick);
};

function ProcessClick(e){
    let t = state.t_response = Date.now();
    // What was clicked?
    let parent = $(e.target).closest('.card');
    let side = parent.attr('id');
    state.response = side;
    let chose_right = state.chose_right = Number(side == 'right-card');
    state.rt = state.t_response - state.t_start_trial;
    state.medium = 'click';
    HandleResponse(chose_right);
}

function CheckKeys(e){
    // This is the cross-browser way of getting the key code
    let k = (typeof e.which == "number" ? e.which : e.keyCode);
    if(globals.resp_keys.indexOf(k) > -1){ ProcessKeys(k); };
}
function ProcessKeys(k){
    let t = state.t_response = Date.now();
    state.response = k;
    state.rt = state.t_response - state.t_start_trial;
    let chose_right = state.chose_right = Number(k == globals.resp_keys[1]);
    state.medium = 'key';
    HandleResponse(chose_right);
}

function HandleResponse(chose_right){
    $(document).off('keydown');
    $('.gamble').off('click');
    $('#target').hide();
    move_hand(chose_right); // Animation
    // Get outcomes
    let prob = (chose_right ? state.prob_right : state.prob_left);
    let win = (chose_right ? state.win_right : state.win_left);
    let loss = (chose_right ? state.loss_right : state.loss_left);
    let outcome = state.outcome = flip(prob);
    let reward = state.reward = (outcome ? win : loss);
    // console.log([chose_right, state.rt, prob, win, loss, outcome, reward]);
    // state.score += reward;
    // Show feedback
    setTimeout(ShowFeedback, 250); // Time taken for hand to move.
}

function move_hand(right){
    let x = right ? '58vw' : '42vw';
    let rot = right ? '30' : '-30';
    let transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    $('#hand').css('left', x).css('transform', transform);
}

function ShowFeedback(){
    let choice = (state.chose_right ? '#right-card' : '#left-card');
    let other = (state.chose_right ? '#left-card' : '#right-card');
    state.chose_risky = state.safe_is_right ? (1 - state.chose_right) : state.chose_right;
    $(other).hide();
    $(choice).addClass('chosen');
    LogData();
}

function LogData(){
    $('#feedback').hide();
    primate.metric(state);
    state.trial_nr +=1;
    let next;
    if(state.trial_nr >= globals.n_trials){
        next = EndExperiment;
    } else {
        next = PrepareTrial;
    }
    setTimeout( next, globals.feedback_time);

}

function EndExperiment(){
    $('#end').show();
    // Redirect in 1 second (if not running on Gorilla)
    setTimeout( primate.finish, 1000);
}

//////////////////////
// Visual Functions //
//////////////////////

function on_resize_custom(){
    state.width =  $( window ).width();
    state.height =  $( window ).height();
    // Modify size and placement of cards according to new screen dimensions.
    let gamble_box_height = $('.gamble').height();
    let gamble_scale = gamble_box_height / 200;
    $('svg.pie').css('transform', `translate(-50%, -50%) scale(${gamble_scale})`);
    $('.card').
        css('width', gamble_box_height*1.1)
        .css('height', gamble_box_height*1.5);

}

function deg2rad(degrees) { return degrees * (Math.PI/180); };

function generate_safe_card(value, id='card'){
    let card = $('<div>') .addClass('card active').attr('id', id);
    let div = $('<div>') .addClass('gamble');
    let lbl, fill;
    if(value > 0){
        fill = 'green';
        lbl = `+£${value}`;
    } else if(value < 0){
        fill = 'red';
        lbl = `-£${Math.abs(value)}`;
    } else  {
        fill = 'white';
        lbl = '£0';
    };
    console.log(value, fill, lbl);
    draw_pie(div, fill);
    div.append( $('<p class="txt-neutral quant"></p>').text(lbl) );
    let gamble_box_height = $('.gamble').height();
    let gamble_scale = gamble_box_height / 200;
    card
        .css('width', gamble_box_height*1.1)
        .css('height', gamble_box_height*1.5);
    $(div).children('svg').css('transform', `translate(-50%, -50%) scale(${gamble_scale})`);
    card.append(div);
    return(card);
}

function generate_risky_card(gain, loss, id='card'){
    let card = $('<div>') .addClass('card active').attr('id', id);
    let div = $('<div>') .addClass('gamble');
    let fill_top = (gain > 0) ? 'green' : null;
    let fill_bottom = (loss < 0) ? 'red' : null;
    let lbl_top = (gain > 0) ? `+£${gain}` : '£0';
    let lbl_bottom = (loss < 0) ? `-£${Math.abs(loss)}` : '£0';
    draw_pie(div, 'white', fill_top, fill_bottom);
    div.append( $('<p class="txt-win quant"></p>').text(lbl_top) );
    div.append( $('<p class="txt-loss quant"></p>').text(lbl_bottom) );
    let gamble_box_height = $('.gamble').height();
    let gamble_scale = gamble_box_height / 200;
    card
        .css('width', gamble_box_height*1.1)
        .css('height', gamble_box_height*1.5);
    $(div).children('svg').css('transform', `translate(-50%, -50%) scale(${gamble_scale})`);
    card.append(div);
    // globals.cards.push(card);
    return(card);
}

function draw_pie(element, fill_circle='white', fill_top=null, fill_bottom=null){
    // element is a jQuery selector for the location of the pie
    let circle,
        upper = "", lower = "";
    circle = `<circle class="${fill_circle}" cx="100" cy="100" r="90"></circle>`;
    if(fill_top){
        upper = `<path class="${fill_top}" d="M100,100 L10,100 A90,90 180 0,1 190,100 z"/>`;
    };
    if(fill_bottom){
        lower = `<path class="${fill_bottom}" d="M100,100 L190,100 A90,90 180 0,1 10,100 z"/>`;
    }
    let outline = '<circle class="outline" cx="100" cy="100" r="90"/>';
    let output = '<svg class="pie">' + circle + upper + lower + outline + '</svg>';
    $(element).append($(output));
};


////////////
// Design //
////////////

function build_mixed(){
    // 5×3 = 15
    let gains = [4, 5, 6];
    let losses = [-1, -3, -5, -7, -9];
    // Pair all gains with all losses
    let design = gains.map(
        g => losses.map(
            function(l){
                let ev = .5 * (g + l); // Expected value of risky minus that of safe
                return {gain: g, loss: l, safe: 0, ev: ev, type: 'mixed'};
            }));
    design = _.flatten(design);
    design = _.shuffle(design);
    return(design);
}

function build_gains(){
    // 5×3 = 15
    let safe = [1, 2, 3];
    let risky = [2, 3, 4, 5, 6];
    // Pair all safe with all risky
    let design = safe.map(
        s => risky.map(
            r => ({gain: r, loss: 0, safe: s, type: 'gain', ev: (.5 * r) - s})));
    design = _.flatten(design);
    design = _.shuffle(design);
    return(design);
}

function build_losses(){
    // 5×3 = 15; Mirror image of the gains
    let safe = [-1, -2, -3];
    let risky = [-2, -3, -4, -5, -6];
    // Pair all safe with all risky
    let design = safe.map(
        s => risky.map(
            r => ({gain: 0, loss: r, safe: s, type: 'loss', ev: (.5 * r) - s})));
    design = _.flatten(design);
    design = _.shuffle(design);
    return(design);
}

function build_design(cb){
    // 45 trials (15 of each type)
    let design = _.shuffle(_.concat(build_mixed(), build_gains(), build_losses()));
    // // Two repetions of 45 trials each
    // let design = _.concat(
    //     _.shuffle(_.concat(build_mixed(), build_gains(), build_losses())),
    //     _.shuffle(_.concat(build_mixed(), build_gains(), build_losses())));
    //// Fake design for screen shots
    // let design = [
    //     {gain: 4, loss: -5, safe: 0, type:'mixed'},
    //     {gain: 4, loss: 0, safe: 2, type:'gain'},
    //     {gain: 0, loss: -5, safe: -2, type:'loss'}
    // ];
    return(design);
}
