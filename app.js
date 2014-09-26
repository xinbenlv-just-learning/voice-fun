var myId = $.cookie("myId") || guid();
$.cookie("myId", myId);
console.log("set id: " + myId);


jQuery(function($) {
    // Template
    var voice_msg_template = $("#voice_msg_template").clone();
    $("#recordingslist").empty();
    // End of Template

    function __log(e, data) {
        //console.log(e);
        //console.log(data);
    }

    var audio_context;
    var recorder;

    function startUserMedia(stream) {
        var input = audio_context.createMediaStreamSource(stream);
        __log('Media stream created.');

        recorder = new Recorder(input);
        __log('Recorder initialised.');
    }

    function startRecording() {
        recorder && recorder.record();
        __log('Recording...');
    }

    function stopRecording() {
        recorder && recorder.stop();
        __log('Stopped recording.');

        // create WAV download link using audio data blob
        createDownloadLink();

        recorder.clear();
    }

    var displayVoiceMsg = function(id, url) {
        var voice_msg = voice_msg_template.clone();
        var data = new Identicon(myId, 30).toString();
        var identicon_url = "data:image/png;base64," + data;
        voice_msg.find(".avatar").css("background-image", "url(" + identicon_url + ")");
        voice_msg.find("audio").attr("src", url);
        $("#recordingslist").append(voice_msg);
    };

    var initLoadVoice = function() {
        var VoiceClip = Parse.Object.extend("VoiceClip");
        var query = new Parse.Query(VoiceClip);
        query.limit(10);
        query.descending("createdAt");
        query.find({
            success: function(results) {
                for (var i=0; i<results.length;i++) {
                    var result = results[i];
                    var mp3 = result.get("voice");
                    var voiceUrl = mp3.url();
                    displayVoiceMsg(result.get("client_id"), voiceUrl);
                }
            }
        });

    }
    function createDownloadLink() {
        recorder && recorder.exportWAV(function(blob) {
            __log(blob);
            var VoiceClip = Parse.Object.extend("VoiceClip");
            var voiceClip = new VoiceClip();
            var reader = new FileReader();
            reader.onload = function(event){
                __log("FileReader");
                __log(event);
                var byteArray = new Uint8Array(event.target.result);

                // TODO(zzn): is this a performance problem?
                var output = new Array( byteArray.length );
                var i = 0;
                var n = output.length;
                while( i < n ) {
                    output[i] = byteArray[i];
                    i++;
                }
                var parseFile = new Parse.File("voice.mp3", output);

                parseFile.save().then(function(){
                    voiceClip.set("client_id", myId);
                    voiceClip.set("voice", parseFile);
                    voiceClip.save().then(function(object){
                        __log("saved a clicp of id" + myId);
                        __log(object);

                        var url = URL.createObjectURL(blob);
                        displayVoiceMsg(myId, url);

                    })
                });
            };
            reader.readAsArrayBuffer(blob);


        });
    }

    $(document).ready(function() {
        // TODO(zzn): putting credentials in the code-base may not be a good idea, but Parse may be different.
        Parse.initialize("pQkbpqhpAJAhcr2PmlUQBmTMhof6YEyRI6htkw38", "Y9u8JIjstr5WVjcYN4cMvwVhIXK4UigS7rxlcj5i");
        initLoadVoice();
        try {
            // webkit shim
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;

            audio_context = new AudioContext;
            __log('Audio context set up.');
            __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
        } catch (e) {
            alert('No web audio support in this browser!');
        }

        navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
            __log('No live audio input: ' + e);
        });

        var ON = 1;
        var OFF = 0;
        var status = OFF;
        var start = function() {
            status = ON;
            startRecording();
            $("#push_to_talk").removeClass("btn-success");
            $("#push_to_talk").addClass("btn-default");
        };
        var stop = function() {
            status = OFF;
            stopRecording();
            $("#push_to_talk").removeClass("btn-default");
            $("#push_to_talk").addClass("btn-success");
        };
        $("#push_to_talk").click(function(){
            if (status == OFF) { // was off, turn on
                start();
            } else { // was on ignore.
                stop();
            }
        });

    });
});