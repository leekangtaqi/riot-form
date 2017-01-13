
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

function filterValidInput(input){
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
    })
    return rules.length;
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
    !tag.formInputListenersMap && (tag.formInputListenersMap = {});
    var id = genId(16);
    input.dataset.eid = id;
    !tag.formInputListenersMap[id] && (tag.formInputListenersMap[id] = {input: input, handlers: []});
    tag.formInputListenersMap[id].handlers.push(validateHandler);
}

function genId(n){
    var chars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    var res = '';
    for(var i = 0; i < n ; i ++) {
        var id = Math.ceil(Math.random()*35);
        res += chars[id];
    }
    return res;
}

function unbindEvt(tag){
    if(!tag.formInputListenersMap){
        return;
    }
    var keys = Object.keys(tag.formInputListenersMap);
    for(var i=0, len = keys.length; i<len; i++){
        var k = keys[i];
        var input = tag.formInputListenersMap[k].input;
        var listeners = tag.formInputListenersMap[input.dataset.eid].handlers;
        listeners.forEach(function(listener){
            input.removeEventListener('input', listener);
        });
    }
    input.dataset.eid = undefined;
    delete input.dataset['eid'];
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
    tag._shouldSync = true;
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
    var resetFormHandler =  function(forms, inputs, selects){
        if(!me.isMounted || !me.opts.$show){
            return;
        }
        me.resetForm();
        forms.length && each(forms, function(node){addForm(node, me)});
        inputs.length && each(inputs, function(node){extractInput(node, me)});
        selects.length && each(selects, function(node){extractInput(node, me)});
        me.update();
    }
    function updateHandler(){
        if(me.opts.$show && !me._shouldSync){
            var forms = me.root.querySelectorAll('form');
            var inputs = [].slice.apply(me.root.querySelectorAll('input')).filter(filterValidInput);
            var selects = [].slice.apply(me.root.querySelectorAll('select')).filter(filterValidInput);
            var data = compareField(me, forms, inputs, selects);
            if(!data
                || data.add.length != 0
                || data.del.length != 0
            ){
                resetFormHandler(forms, inputs, selects);
            }; 
        }
        me._shouldSync = false;
    } 
    /**
     * check form structure changed or not
     * @param tag { Object } riot tag
     * @param forms { Array<DomElement> }
     * @param inputs { Array<DomElement> }
     * @param selects { Array<DomElement> }
     */
    function compareField(tag, forms, inputs, selects){
        if(!tag.forms){
            return false;
        }
        var formNames = [].slice.call(forms).map(function(form){ return form.getAttribute('name') });
        var inputNames = inputs && groupBy([].slice.call(inputs), function(input){
            return input.form.getAttribute('name');
        }, function(input){
            return input.getAttribute('name');
        }) || {};
        var selectNames = selects && groupBy([].slice.call(selects), function(input){
            return input.form.getAttribute('name');
        }, function(input){
            return input.getAttribute('name');
        }) || {};
        var formToAdd = [];
        var prevForms = Object.keys(tag.forms) || [];
        for(var i=0, len=forms.length; i<len; i++){
            var form = forms[i];
            var formName = form.getAttribute('name');
            var formInTag = tag.forms[formName];
            prevForms = prevForms.filter(function(f){
                return f != formName;
            })
            if(!formInTag){
                formToAdd.push(form);
                continue;
            }
            var fields = extractField(formInTag);
            var fieldNames = Object.keys(fields);
            for(var j=0, len2=fieldNames.length; j<len2; j++){
                var fieldName = fieldNames[j];
                if(
                isFieldModified(formName, fieldName, inputNames, selectNames) ||
                (
                    len2 != 
                        (inputNames[formName] && inputNames[formName].length || 0) + 
                        ((selectNames[formName] && selectNames[formName].length) || 0))
                ){
                    formToAdd.push(formName);
                    break;
                }
            }
        }
        return { add: formToAdd, del: prevForms };
    }

    function isFieldModified(formName, fieldName, inputNames, selectNames){
        var checkInput = inputNames && inputNames[formName] && inputNames[formName].length && inputNames[formName].indexOf(fieldName) < 0 || false;
        var checkSelect = selectNames && selectNames[formName] && selectNames[formName].length && selectNames[formName].indexOf(fieldName) < 0 || false;
        return (checkInput && checkSelect);
    }
    
    function groupBy(arr, fn1, fn2){
        var res = {};
        for(var i=0, len=arr.length; i<len; i++){
            var c = fn1(arr[i]);
            !res[c] && (res[c] = []);
            res[c].push(fn2(arr[i]));
        }
        return res;
    }
    me.on('updated', updateHandler);
}

function each(arrLike, cb){
    for(var i=0, len=arrLike.length; i<len; i++){
        cb(arrLike[i]);
    }
}

function resetForm(){
    var tag = this;
    unbindEvt(this);
    delete this['forms'];
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

function registerValidators(name, fn){
    validators[name] = fn;
}

window.form = {
    useForm: initForm,
    resetForm: resetForm
};
