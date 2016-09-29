var validators = {};

var buildinValidators = [
    {
        name: "required",
        fn: function(val){
            return val.trim() === ""
        }
    },
    {
        name: 'max',
        fn: function(val, expected){
            return parseInt(val.trim(), 10) > expected;
        }
    },
    {
        name: 'min',
        fn: function(val, expected){
            return parseInt(val.trim(), 10) < expected;
        }
    },
    {
        name: 'maxlength',
        fn: function(val, expected){
            return val.length > expected;
        }
    },
    {
        name: 'minlength',
        fn: function(val, expected){
            return val.length < expected;
        }
    },
    {
        name: 'pattern',
        fn: function(val, expected){
            return !(new RegExp(expected)).test(val.trim());
        }
    }
];

/**
 * register build-in validators
 */
buildinValidators.map(function(validator){
    registerValidators(validator.name, validator.fn);
});

function addForm(f, tag){
    if(!f || !f.attributes || !f.attributes.name || !f.attributes.name.nodeValue){
        throw new Error("form expected a name attribute");
    }
    var formName = f.attributes.name.nodeValue;
    var validated = false;
    var form = {
        $name: formName,
        $dirty: false,
        $pristine: true,
        $valid: false,
        $invalid: true,
        $submitted: false,
        $error: {},
        $ok: function(){
            var o = extractField(this);
            var errors = Object.keys(o).filter(function(field){
                return o && o[field].$error && Object.keys(o[field].$error).length > 0
            });
            if(errors.length){
                return false;
            }
            return true;
        },
        $allPristine: function(){
            var o = extractField(this);
            return Object.keys(o).map(function(field){
                return o && o[field].$pristine;
            }).reduce(function(acc, curr){
                return acc && curr
            }, true);
        },
        $allDirty: function(){
            var o = extractField(this);
            return Object.keys(o).map(function(field){
                return o[field].$dirty;
            }).reduce(function(acc, curr){
                return acc && curr
            }, true);
        },
        $validate: function(){
            if(!validated){
                validated = !validated;
                var o = extractField(this);
                var allInputExist = !!Object.keys(o).map(function(fieldKey){
                    return tag[fieldKey];
                }).reduce(function(acc, curr){
                    if(!curr){
                        return undefined;
                    }
                    return acc;
                }, {});
                if(allInputExist){
                    Object.keys(o).map(function(fieldKey) {
                        var field = o[fieldKey];
                        if(field.$rule.required === ""){
                            if(tag[fieldKey]&& Array.isArray(tag[fieldKey])){
                                tag[fieldKey] = document.getElementsByName(tag[fieldKey][0].getAttribute('name'))[0];
                            }
                            validateField(tag[fieldKey].value, tag[fieldKey], field, tag);
                        }
                    });
                }
            }
            return this.$ok();
        }
    };
    if(!tag.forms){
        tag.forms = {};
    }
    tag.forms[form.$name] = form;
}

function extractInput(input, tag){
    if(input.attributes.type && input.attributes.type.nodeValue === 'submit'){
        return handleSubmit(input, tag);
    }
    var rules = Object.keys(input.attributes).map(function(key){
        var ruleName = input.attributes[key].nodeName;
        var validVal = input.attributes[key].nodeValue;
        if(validators[ruleName]){
            return {
                name: ruleName,
                val: validVal
            };
        }
        return false;
    }).filter(function(rule){
        return rule != false;
    });
    if(rules.length){
        rules.forEach(function(rule){
            addFormRule(input, rule, tag);
        });
    }
    var formName = input.form.attributes['name'].value;
    if(tag.forms[formName]
        && input.attributes.name
        && input.attributes.name.nodeValue
        && tag.forms[formName][input.attributes.name.nodeValue]){
        var field = tag.forms[formName][input.attributes.name.nodeValue];
        bindEvt(input, field, tag);
    }
}

function handleSubmit(input, tag){

}

function addFormRule(input, rule, tag){
    var inputName = input.attributes.name.nodeValue;
    var formName = input.form.attributes["name"].value;
    var formField = tag.forms[formName][inputName];
    if(!formField){
        tag.forms[formName][inputName] = {
            $name: inputName,
            $dirty: false,
            $pristine: true,
            $valid: true,
            $invalid: false,
            $error: {},
            $rule: {},
            $originVal: tag[inputName].value
        };
    }
    tag.forms[formName][inputName].$rule[rule.name] = rule.val;
}

function bindEvt(input, field, tag){
    var validateHandler = function(e){
        var val = e.target.value.trim();
        if(val === field.$originVal){
            field.$pristine = true;
            field.$dirty = false;
        }else{
            field.$pristine = false;
            field.$dirty = true;
        }
        resetFormPristineOrDirty(input, tag);
        validateField(val, input, field, tag);
    }
    input.addEventListener('input', validateHandler);
    !tag.formInputListenersMap && (tag.formInputListenersMap = new Map());
    !tag.formInputListenersMap[input] && (tag.formInputListenersMap[input] = []);
    tag.formInputListenersMap[input].push(validateHandler);
}

function unbindEvt(tag){
    if(!tag.formInputListenersMap){
        return;
    }
    for(var input of tag.formInputListenersMap.keys()){
        var listeners = tag.formInputListenersMap[input];
        listeners.forEach(function(listener){
            input.removeEventListener('input', listener);
        });
    }
    tag['formInputListenersMap'] && delete tag['formInputListenersMap'];
}

function resetFormPristineOrDirty(input, tag){
    var formName = input.form.attributes['name'].value;
    var isFormDirty = Object.keys(extractField(tag.forms[formName])).map(function(inputName){
        return tag.forms[formName][inputName];
    }).reduce(function(acc, curr){
        if(!curr.$pristine){
            return curr;
        }
        return acc;
    }, {$pristine: true, $dirty: false}).$dirty;
    tag.forms[formName].$dirty = isFormDirty;
    tag.forms[formName].$pristine = !isFormDirty;
}

function validateField(val, input, field, tag){
    var errorMap = field.$rule;
    Object.keys(errorMap).forEach(function(eKey){
        var isInvalid = validators[eKey].apply(null, [val, errorMap[eKey]]);
        if(isInvalid){
            setFieldStatusInvalid(field, eKey);
            addClass(input, 'f-invalid-' + eKey);
        }else{
            setFieldStatusValid(field, eKey);
            removeClass(input, 'f-invalid-' + eKey)
        }
    });
    if(Object.keys(field.$error).length > 0){
        removeClass(input, 'f-valid');
        addClass(input, 'f-invalid');
    }else{
        removeClass(input, 'f-invalid');
        addClass(input, 'f-valid');
    }
    if(field.$dirty) {
        addClass(input, 'f-dirty');
        removeClass(input, 'f-pristine');
    }
    if(field.$pristine){
        addClass(input, 'f-pristine');
        removeClass(input, 'f-dirty');
    }
    tag.update();

    function setFieldStatusInvalid(field, key){
        field.$invalid = true;
        field.$valid = false;
        field.$error[key] = true;
    }
    function setFieldStatusValid(field, key){
        field.$invalid = false;
        field.$valid = true;
        field.$error[key] && delete field.$error[key];
    }
    function hasClass(el, className) {
        if (el.classList)
            return el.classList.contains(className);
        else
            return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
    }

    function addClass(el, className) {
        if (el.classList)
            el.classList.add(className);
        else if (!hasClass(el, className)) el.className += " " + className
    }

    function removeClass(el, className) {
        if (el.classList)
            el.classList.remove(className);
        else if (hasClass(el, className)) {
            var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
            el.className=el.className.replace(reg, ' ')
        }
    }
}

function initForm(){
    var me = this;
    this.on('mount', function(){
        var tag = me;
        walkTheDOM(this.root, function (node) {
            if (node.nodeType === 1) {
                if(node.tagName === 'form'.toUpperCase()){
                    addForm(node, tag);
                }
                if(node.tagName === 'input'.toUpperCase() ||
                   node.tagName === 'select'.toUpperCase()
                ){
                    extractInput(node, tag);
                }
            }
        });
    });
    nextTick(function(){
        me.update();
    })
}


function reForm(tag){
    walkTheDOM(tag.root, function (node) {
        if (node.nodeType === 1) {
            if(node.tagName === 'form'.toUpperCase()){
                addForm(node, tag);
            }
            if(node.tagName === 'input'.toUpperCase() ||
                node.tagName === 'select'.toUpperCase()
            ){
                extractInput(node, tag);
            }
        }
    });
    nextTick(function(){
        tag.update();
    })
}

function resetForm(){
    var tag = this;
    unbindEvt(this);
    delete this['forms'];
    setTimeout(function(){ reForm(tag); }, 0)
}

function exclude(){
    var args = [].slice.apply(arguments);
    var o = args[0];
    var props = args.slice(1);
    var res = {};
    for(var p in o){
        if(props.indexOf(p) < 0){
            res[p] = o[p]
        }
    }
    return res;
}

function extractField(o){
    return exclude(o,
        "$name",
        "$dirty",
        "$pristine",
        "$valid",
        "$invalid",
        "$submitted",
        "$error",
        "$ok",
        "$allPristine",
        "$allDirty",
        "$validate"
    );
}

function nextTick(fn){
    setTimeout(fn, 0)
}

function walkTheDOM(node, func) {
    func(node);
    node = node.firstChild;
    while (node) {
        walkTheDOM(node, func);
        node = node.nextSibling;
    }
}

function registerValidators(name, fn){
    validators[name] = fn;
}

window.form = {
    useForm: initForm,
    resetForm
};
