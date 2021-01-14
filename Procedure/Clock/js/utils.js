// static/utils.js
// Helper functions used in multiple experiments
function Pass(){}

// Handle buttons
function bind_to_key(func, key){
    // Given a function, and a numeric keycode,
    // set the function to run once the appropriate key is pressed.
    // If not provided, the key default to 32 (the spacebar)
    key = key || 32;
    $(document)
        .off('keydown')
        .one('keydown', function(e){
            let k = (typeof e.which == "number") ? e.which : e.keyCode;
            if(k == key){
                func(e);
            } else {
                // Rebind
                bind_to_key(func, key);
            }
        });
}


function reset_subject_nr(){
    // Check the cookies for a subject number.
    // If none found, generate a random one and save to cookies.
    let subject_nr = Math.round(Math.random()*1000000000);
    localStorage['subject_nr'] = subject_nr;
    return subject_nr;
}

function get_subject_nr(){
    // Check the cookies for a subject number.
    // If none found, generate a random one and save to cookies.
    let subject_nr = localStorage['subject_nr'];
    subject_nr = (typeof subject_nr === 'undefined') ? reset_subject_nr() : subject_nr;
    return subject_nr;
}

function on_resize(){
  // Call
  // $( window ).resize(_.debounce(resize, 100));
  // in your script to keep track of the size of the window.
  // The `state` variable must already exist.
  state.width =  $( window ).width();
  state.height =  $( window ).height();
};

function generate_random_list(length){
    // Random numbers from 0 to (length-1)
    return _.shuffle(_.range(length));
};

function flip(probability){
    // Flip a (optionally biased) coin
    probability = probability || .5;
    var r = Math.random();
    return Number(r < probability);
}

function random_normal(mu, sigma) {
    // Standard Normal variate using Box-Muller transform.
    // Defaults to N(0, 1)
    mu = mu || 0;
    sigma  = sigma || 1;
    var u = 1 - Math.random(); // Subtraction to flip [0, 1) to (0, 1].
    var v = 1 - Math.random();
    return mu + sigma*Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function send_ajax(url, data){
    // Try to send some data to the url provided, and print the response.
    $.ajax({
        type: 'POST',
        url: url,
        data: JSON.stringify(data),
        success: function(res) { console.log(res); }
    });
}

function repeat(vals, n){
    // Create array that repeats each of `values` `n` times.
    if(typeof(n)=='number'){
        // Single n
        return _.flatMap(vals, v => Array(n).fill(v));
    } else {
        // Array of ns
        return _.flatten(_.zip(vals, n).map(
            x => Array(x[1]).fill(x[0])));
    }
}

// function repeat(vals, n){
//     // WORKS ON I.E.
//     // Create array that repeats each of `values` `n` times.
//     if(typeof(n)=='number'){
//         // Single n
//         return _.flatMap(vals, v => _.fill(Array(n), v));
//     } else {
//         // Array of ns
//         return _.flatten(_.zip(vals, n).map(
//             x => _.fill(Array(x[1]), x[0])));
//     }
// };


function select_everything(parent='#gorilla'){
    return $(parent).find('*');
}

function show_everything(parent='#gorilla'){
    return select_everything(parent).show();
}
function hide_everything(parent='#gorilla'){
    return select_everything(parent).hide();
}

function download_file(data, filename, type='text/plain') {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}
