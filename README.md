# riot-form
this is a riot form mixin

###Install
    npm install riot-form-mixin

###Usage

```js
<test>
    <form name="my_form">
        <input required/>
    </form>
    <script>
        this.mixin('form');
        this.useForm();
        //...
    </script>
</test>
```

###Validators

####Built-in validators

    type="email"
    type="url"
    type="number"
    required
    minlength
    maxlength
    pattern
    min (for type="number")
    max (for type="number")

####Associated state classes

.f-invalid .f-valid
    
when error:
    
.f-invalid-required .f-invalid-max  ...

####Custom validator

```js
registerValidators({
    name: 'custom-validator',
    fn: function(){
        return ...
    }
})
```
