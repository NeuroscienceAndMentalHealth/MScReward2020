// chimp.js - Gorilla's little cousin
// This file duplicates the functions in the Gorilla API.
// Use it as a replacement when developing experiments
// what will eventually be uploaded to Gorilla.

// See https://gorilla.sc/support/api/gorilla
// for documentation on the original API

const gorilla = (function(){
    function ready(cb){
        // Nothing to prepare, just do it now.
        // cb();
        // Just call the callback when the document is ready.
        $(document).on('ready', cb);
    }

    function manipulation(string, def){
        // We can't retrieve anything, so just use the default.
        console.log(`chimp.js can't retrive manipulation '${string}'`);
        console.log(`Using default value: ${def}`);
        return def;
    }

    // For store and retrieve, use localStorage.
    // Since localStorage saves everything as a string,
    // save a supplementary entry indicating what the type should be,
    // and use _to_type() to cooerce the value as appropriate.

    function _to_type(value, type_string){
        if(type_string=='object') { return JSON.parse(value); }
        if(type_string=='number') { return Number(value); }
        if(type_string=='string') { return value; }
        if(type_string=='boolean') { return Boolean(value); }
    }

    function store(key, value, global){
        localStorage[key] = value;
        localStorage[key + '_type'] = typeof(value);
    }

    function storeMany(values, global){
        for(k in values){
            store(k, values[k]);
        }
    }

    function retrieve(key, global){
        let type_string = localStorage[key + '_type'];
        let val = localStorage[key];
        return _to_type(val, type_string);
    }

    function metric(results){
        // Upload to server
        $.ajax({
            type: 'POST',
            url: 'log.php',
            data: results,
            success: function(res) { console.log(res); }
        });
    }

    function stimuliURL(name){
        return 'static/stimuli/' + name;
    }

    function shuffle(x){
        return _.shuffle(x);
    }

    function populate(){
        console.log('`populate()` is not supported');
    }

    function populateAndLoad(){
        console.log('`populateAndLoad()` is not supported');
    }

    function finish(overrideURL){
        if(typeof overrideURL !== 'undefined')  {
            window.location.href = overrideURL;
        } else {
            alert('End of Experiment!');
        }
    }

    let exports = {
        ready : ready,
        manipulation : manipulation,
        retrieve : retrieve,
        store : store,
        storeMany : storeMany,
        metric : metric,
        stimuliURL : stimuliURL,
        shuffle : shuffle,
        populate : populate,
        populateAndLoad : populateAndLoad,
        finish: finish,
        is_chimp: true
    };
    return(exports);
})();
