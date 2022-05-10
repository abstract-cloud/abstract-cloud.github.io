const bus = new Vue();
const lxhtmlBus = new Vue();

var SPOO_Client = SpooClient;

SpooClient.define({
    name: 'application',
    pluralName: 'applications',
    url: 'application',
    pluralUrl: 'applications',
});

SpooClient.define({
    name: 'template',
    pluralName: 'templates',
    url: 'template',
    pluralUrl: 'templates',
});

SpooClient.define({
    name: 'object',
    pluralName: 'objects',
    url: 'object',
    pluralUrl: 'objects',
});

SpooClient.define({
    name: 'eventlog',
    pluralName: 'eventlogs',
    url: 'eventlog',
    pluralUrl: 'eventlogs',
});

SpooClient.define({
    name: 'file',
    pluralName: 'files',
    url: 'file',
    pluralUrl: 'files',
});

SpooClient.define({
    name: 'script',
    pluralName: 'scripts',
    url: 'script',
    pluralUrl: 'scripts',
});

SpooClient.define({
    name: 'user',
    pluralName: 'users',
    url: 'user',
    pluralUrl: 'users',
    authable: true,
});

var spoo = new SpooClient(localStorage['clientId'], {url: "https://spoo.rocks/api"})

var isObject = (a) => {
    return (!!a) && (a.constructor === Object);
};

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

window.puzzle.output = function() {
    var args = Array.from(arguments);
    var i;
    for (i = 0; i < args.length; i++) {
        if (Array.isArray(args[i])) {
            args[i] = JSON.stringify(args[i], null, 4);
        }

        if (isObject(args[i])) args[i] = JSON.stringify(args[i], null, 4);
    }


    bus.$emit('puzzle-response', args.join(" "))
}

var syntax = {
  $: {
    spoo_shell: {
        _static: {
            rootNode: 'body',
            execStatement: (done, ctx) => {

                var output = document.getElementById('output');
                console.log('ctx', ctx);

                var body = ctx.body;

                var instructor = {
                    add: function() {
                        spoo.io()[ctx.family](body).add(function(data, err) {
                            if (err) console.error(err)
                            else {
                                console.log(data);
                                done();
                            }
                        })
                    },
                    get: function() {
                        spoo.io()[ctx.family](body).get(function(data, err) {
                            if (err) console.error(err)
                            else {
                                var _output = "";
                                data.forEach(d => {
                                    var sO = JSON.stringify(d);
                                    _output += "<span onclick='openObject(\""+d._id+"\", \""+d.role+"\")' class='leto-m-xs'><span style='padding:1px 5px; background:#bbbbbb;color:#000000; border-radius:100px'>{"+d.name+"}</span></span>"
                                })
                                console.log(_output)
                                output.innerHTML = _output//JSON.stringify(data, false, 3)
                                done();
                            }
                        })
                    },
                    delete: function() {
                        spoo.io()[ctx.family](body).delete(function(data, err) {
                            if (err) console.error(err)
                            else {
                                console.log(data);
                                done();
                            }
                        })
                    },
                    update: function() {
                        if (!ctx.alterData) return done();

                        var updatable = spoo.io()[ctx.family](body);

                        Object.keys(ctx.alterData).forEach(a => {
                            if (Array.isArray(ctx.alterData[a])) {
                                updatable[a](...ctx.alterData[a])
                            } else {
                                updatable[a](ctx.alterData[a])
                            }
                        })

                        updatable.save(function(data, err) {
                            if (err) console.error(err)
                            else {
                                console.log(data);
                                done();
                            }
                        })
                    }
                }

                if (ctx.method) {
                    instructor[ctx.method](ctx);
                } else done();
            }
        },
      echo: {
        follow: ["{param}", "$and"],
        method: function(ctx, param){
          console.log(param)
          puzzle.output(param)
        }
      },
      workspace: {
                follow: ["{ws}"],
                    method: function(ctx, ws) {
                        syntax.spoo = new SpooClient(ws, {url: "https://spoo.rocks/api"})
                    }
                },
                app: {
                    follow: ["{app}"],
                    method: function(ctx, app) {
                        syntax.spoo = new SpooClient(localStorage['clientId'], {url: "https://spoo.rocks/api"}).app(app);
                    }
                },
                auth: {
                    follow: ["{username,password,permanent}"],
                    method: function(ctx, data) {
                        syntax.spoo.auth(data.username, data.password, function(data, err) {
                            if (err)
                                console.error(err);
                            else console.log(data);
                        }, data.permanent || false);
                    }
                },
                add: {
                    follow: ["{family}", "$width"],
                    method: function(ctx, family) {
                        ctx.family = family;
                        ctx.method = 'add';
                    }
                },
                get: {
                    follow: ["{family}", "$width"],
                    method: function(ctx, family) {
                        ctx.family = family;
                        ctx.method = 'get';
                    }
                },
                update: {
                    follow: ["{family}", "$width", "set"],
                    method: function(ctx, family) {
                        ctx.family = family;
                        ctx.method = 'update';
                    }
                },
                width: {
                    follow: ["{body}"],
                    method: function(ctx, body) {
                        console.log(body)
                        ctx.body = eval('(' + body + ')');
                    }
                },
                set: {
                    follow: ["{body}"],
                    method: function(ctx, body) {
                        ctx.body = body;
                    }
                },
                alter: {
                    follow: ["{updateObj}"],
                    method: function(ctx, updateObj) {
                        console.log(updateObj)
                        ctx.alterData = eval('(' + updateObj + ')');
                    }
                },
                "include-script": {
                    follow: ["{file}"],
                    method: function(ctx, file) {
                        var file = window.puzzle.getRawStatement(file);
                        spoo.io().scripts({name: file}).get((data, err) => {
                            if(err || !data.length) return window.puzzle.error('Error including script');
                            try {
                                window.puzzle.parse(data[0].content.value);
                            } catch(e) {
                                window.puzzle.error('Error including script');
                            }
                        })
                    }
                },
    }
  }
}

puzzle.parse(`use var:syntax`)

var emojis = [
    '😄', '😃', '😀', '😊', '😉', '😍', '😘', '😚', '😗', '😙', '😜', '😝', '😛', '😁', '😂', '😅', '😆', '😋', '😎', '😲', '😈', '😇', '👲', '👳', '👮', '👷', '👦', '👧', '👨', '👩', '👴', '👵', '👱', '👼', '👸', '😺', '😸', '😻', '😽', '😼', '😹', '🙈', '🙉', '🙊', '💀', '👽', '💩', '🔥', '✨', '🌟', '💫', '💥', '💢', '💦', '💧', '💨', '👂', '👀', '👃', '👅', '👄', '👍', '👌', '👊', '✊', '👋', '✋', '👆', '🙌', '🙏', '👏', '💪', '🚶', '🏃', '💃', '👫', '👪', '👬', '👭', '💏', '💑', '👯', '🙆', '🙅', '💁', '🙋', '💇', '💅', '👰', '🙎', '🙇', '🎩', '👑', '👒', '👟', '👞', '👡', '👠', '👢', '👕', '👔', '👚', '👗', '🎽', '👖', '👘', '👙', '💼', '👜', '👝', '👛', '👓', '🎀', '🌂', '💄', '💛', '💙', '💜', '💚', '💗', '💓', '💕', '💖', '💞', '💘', '💌', '💋', '💍', '💎', '👤', '👥', '💬', '👣', '💭', '🐶', '🐺', '🐱', '🐭', '🐹', '🐰', '🐸', '🐯', '🐨', '🐻', '🐷', '🐽', '🐮', '🐗', '🐵', '🐒', '🐴', '🐑', '🐘', '🐼', '🐧', '🐦', '🐤', '🐥', '🐣', '🐔', '🐍', '🐢', '🐛', '🐝', '🐜', '🐞', '🐌', '🐙', '🐚', '🐠', '🐟', '🐬', '🐳', '🐋', '🐄', '🐏', '🐀', '🐃', '🐅', '🐇', '🐉', '🐎', '🐐', '🐓', '🐕', '🐖', '🐁', '🐂', '🐲', '🐡', '🐊', '🐫', '🐪', '🐆', '🐈', '🐩', '🐾', '💐', '🌸', '🌷', '🍀', '🌹', '🌻', '🌺', '🍁', '🍃', '🍂', '🌿', '🌾', '🍄', '🌵', '🌴', '🌲', '🌳', '🌰', '🌱', '🌼', '🌐', '🌞', '🌝', '🌚', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌜', '🌛', '🌙', '🌍', '🌎', '🌏', '🌋', '🌌', '🌠', '⭐', '☀', '⛅', '⛄', '🌀', '🌁', '🌈', '🌊', '🎍', '💝', '🎎', '🎒', '🎓', '🎏', '🎆', '🎇', '🎐', '🎑', '🎃', '👻', '🎅', '🎄', '🎁', '🎋', '🎉', '🎊', '🎈', '🎌', '🔮', '🎥', '📷', '📹', '📼', '💿', '📀', '💽', '💾', '💻', '📱', '☎', '📞', '📟', '📠', '📡', '📺', '📻', '🔊', '🔉', '🔈', '🔇', '🔔', '🔕', '📢', '📣', '⏳', '⌛', '⏰', '⌚', '🔓', '🔒', '🔏', '🔐', '🔑', '🔎', '💡', '🔦', '🔆', '🔅', '🔌', '🔋', '🔍', '🛁', '🛀', '🚿', '🚽', '🔧', '🔩', '🔨', '🚪', '🚬', '💣', '🔫', '🔪', '💊', '💉', '💰', '💴', '💵', '💷', '💶', '💳', '💸', '📲', '📧', '📥', '📤', '✉', '📩', '📨', '📯', '📫', '📪', '📬', '📭', '📮', '📦', '📝', '📄', '📃', '📑', '📊', '📈', '📉', '📜', '📋', '📅', '📆', '📇', '📁', '📂', '📌', '📎', '📏', '📐', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚', '📖', '🔖', '📛', '🔬', '🔭', '📰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🎻', '🎺', '🎷', '🎸', '👾', '🎮', '🃏', '🎴', '🀄', '🎲', '🎯', '🏈', '🏀', '⚽', '⚾', '🎾', '🎱', '🏉', '🎳', '⛳', '🚵', '🚴', '🏁', '🏇', '🏆', '🎿', '🏂', '🏊', '🏄', '🎣', '☕', '🍵', '🍶', '🍼', '🍺', '🍻', '🍸', '🍹', '🍷', '🍴', '🍕', '🍔', '🍟', '🍗', '🍖', '🍝', '🍛', '🍤', '🍱', '🍣', '🍥', '🍙', '🍘', '🍚', '🍜', '🍲', '🍢', '🍡', '🍳', '🍞', '🍩', '🍮', '🍦', '🍨', '🍧', '🎂', '🍰', '🍪', '🍫', '🍬', '🍭', '🍯', '🍎', '🍏', '🍊', '🍋', '🍒', '🍇', '🍉', '🍓', '🍑', '🍈', '🍌', '🍐', '🍍', '🍠', '🍆', '🍅', '🌽', '🏠', '🏡', '🏫', '🏢', '🏣', '🏥', '🏦', '🏪', '🏩', '🏨', '💒', '⛪', '🏬', '🏤', '🌇', '🌆', '🏯', '🏰', '🗽', '🎡', '⛲', '🎢', '🚢', '⛵', '🚤', '🚣', '⚓', '🚀', '✈', '💺', '🚁', '🚂', '🚊', '🚉', '🚞', '🚆', '🚄', '🚅', '🚈', '🚇', '🚝', '🚋', '🚃', '🚎', '🚌', '🚍', '🚙', '🚘', '🚗', '🚕', '🚖', '🚛', '🚚', '🚨', '🚓', '🚔', '🚒', '🚑', '🚐', '🚲', '🚡', '🚟', '🚠', '🚜', '💈', '🚏', '🎫', '🚦', '🚥', '⚠', '🚧', '🔰', '⛽', '🏮', '🎰', '♨', '🗿', '🎪', '🎭', '📍', '🚩', '🔝', '🔚', '🔙', '🔛', '🔜'
];

var app = new Vue({
    el: '#app',
    data: {
        applications: [],
        currentApp: null,
        currentFile: {},
        pfiles: [],
        loginData: {},
        authenticated: false,
        sideBarShown: true,
        content: "",
        output: "",
    },
    methods: {
        showIncludeAlert: function(id){
            alert('include '+id)
        },
        login: function() {

            var self = this;
            spoo = new SpooClient(self.loginData.workspace, {url: "https://spoo.rocks/api"})

            spoo.io().auth(self.loginData.username, self.loginData.password, (data,err) => {
                if(data){
                    self.authenticated = true;
                    localStorage['clientId'] = self.loginData.workspace;
                } else alert("Login error")
            }, true)
        },
        loadPFiles: function(){
            var self = this;
            spoo.io().scripts({}).get((data, err) => {
                self.pfiles = data;
            })
        },
        addPFile: function(){
            var name = prompt('name', '');
            spoo.io().script({
                type: "puzzle_file",
                name: name,
                    content: {
                        type: "action",
                        value: "..."
                    }
                
            }).add()
        },
        setContent: function(content){
            this.content = content;
            bus.$emit('set-content', content);
        },
        saveFile: function(){
            var self = this;

            spoo.io().script(self.currentFile._id).setPropertyValue('content', self.content).save((data, err) => {
                if(err) return alert("Error saving");
            })
        },

        // create random id (for initial project generation)
        makeid: function(length) {

            if ((window.navigator.platform.match("Mac") ? window.event.metaKey : window.event.ctrlKey)) return emojis[Math.floor(Math.random() * emojis.length)];

            var result = '';
            var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var charactersLength = characters.length;
            for (var i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        },

        // run a puzzle script
        runCode: function(code) {
            this.output = '';
            console.log('running', code)
            puzzle.parse(code);
        },

        scrollTo: function(mode){
            switch(mode){
                case 'output':
                    window.scrollTo(0,800)
                break;
                case 'ide':
                    window.scrollTo(0,10000)
                break;
            }
        },
       
        saveContent: function() {
            var self = this;

            self.saveFile()
        }
    },
    watch: {
        authenticated: function(val){
            var self = this;
            if(val == true){
                spoo.io().applications({}).get((data, err) => {
                    if(err) return console.log('error');
                    self.applications = data;
                })
            }
        },
        currentApp: function(app){
            var self = this;
            spoo = new SpooClient(localStorage['clientId'], {url: "https://spoo.rocks/api"}).app(app.name)
            self.loadPFiles(app)
        },
    },
    created: function() {

        var self = this;

        console.info("Welcome to LX");

        if (!localStorage.getItem('welcomeMsgHidden')) this.welcomeMsg = true;

       
        // initialize ace.js editor
        document.addEventListener('DOMContentLoaded', function() {

            if(localStorage['clientId'])
            {
                spoo = new SpooClient(localStorage['clientId'], {url: "https://spoo.rocks/api"})
                spoo.io().authenticated(decision => {
                    self.authenticated = decision;

                    if(decision && window.location.hash){

                        var fileName = window.location.hash.substring(1);
                        
                        spoo.io().scripts({name: fileName}).get((data, err) => {
                            if(err || !data.length) return self.output = 'Error: File not loaded.'
                            else self.runCode(data[0].content.value)
                        })

                    }
                })
            }

            var editor = ace.edit("editor");
            editor.setTheme("ace/theme/monokai");
            editor.session.setMode("ace/mode/javascript");
            editor.setOption("showPrintMargin", false);
            editor.setOption("useWorker", false);
            editor.setOption("fontSize", '15px');


            editor.on('change', (arg, activeEditor) => {
                Vue.set(self, 'content', activeEditor.getSession().getValue());

                const aceEditor = activeEditor;
                const newHeight = aceEditor.getSession().getScreenLength() *
                    (aceEditor.renderer.lineHeight + aceEditor.renderer.scrollBar.getWidth());
                aceEditor.container.style.height = `${newHeight}px`;
                aceEditor.resize();
            });

            bus.$on('set-content', function(k) {
                console.log(editor.session, k, 'sdgsdg')
                editor.getSession().setValue(k)
            })




        }, false);

        // display output from puzzle script
        bus.$on('puzzle-response', function(c) {
            self.output += c
        })

        // key handlers for save, run and add tab
        document.addEventListener("keydown", function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                self.saveContent();
            }

            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 84) {
                e.preventDefault();
                self.addFile(undefined, "", "", self.currentProject);
            }

            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 13) {
                e.preventDefault();
                console.log(self.content);
                self.runCode(self.content)
            }
        }, false);

        // lxhtml specific: get custom code to render
        lxhtmlBus.$on('custom-content', function(content) {
            console.log(content);
            self.customContent.html = content.html;
            self.customContent.style = content.style;
            self.customContent.js = content.js;

            new Function(content.js)();
        })

    }
})