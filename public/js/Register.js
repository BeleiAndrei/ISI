// var Register = Backbone.View.extend({
var Register = function(){};

Register.prototype = {
    el: "#register-form",
    events: {
        "submit": "submitForm",
        "blur .form-control": "checkInput"
    },

    initialize: function() {
        $(this.el).on("submit", _.bind(this.submitForm, this));
        $(this.el).on("blur", ".form-control", _.bind(this.checkInput, this));
    },

    submitForm: function(e) {
        e.preventDefault();

        var base_elements = {
            name: $(this.el).find('#fillname'),
            email: $(this.el).find('#email'),
            pass: $(this.el).find('#password'),
            confpass: $(this.el).find('#confirm-password')
        };

        var errs = this.validateBaseElements(base_elements);

        if (!errs) {
            this.sendForm();
        }
    },

    sendForm: function(e) {
        var data = {
            name: $(this.el).find('#fullname').val(),
            email: $(this.el).find('#email').val(),
            pass: $(this.el).find('#password').val(),
            phone: $(this.el).find('#phone').val(),
            interests: JSON.stringify($(this.el).find('#interests').val())
        };

        console.log(data);

        $.ajax({
            url: "/register",
            method: "POST",
            data: data,
            dataType: "json",
            success: _.bind(function(err) {
                console.log ("Registered");
                if (!err.length) {
                    $(document).trigger("login", [data.email, data.pass]);
                }

                console.log(err);
            }, this),
            error: function() {
                console.log ("Error registering");
            }
        });
    },

    validateBaseElements: function(data) {
        var errors = [];
        Object.keys(data).map(_.bind(function(field) {
            if (!this.checkInput(data[field])) {
                errors.push(field);
            }
        }, this));

        !this.checkPassMatch() ? errors.push("confpass") : null;

        return errors.length;
    },

    checkInput: function(e) {
        var $el;
        if (e.length) {
            $el = e;
        } else {
            $el = $(e.target);
        }

        /* Mandatory fields */
        if ($el.hasClass('mandatory')) {
            if (!$el.val().length) {
                $el.addClass('error');
                return false;
            } else {
                $el.removeClass('error');
            }
        }

        /* Email check */
        if ($el.hasClass('email')) {
            if (!this.validateEmail($el.val())) {
                $el.addClass('error');
                return false;
            } else {
                $el.removeClass('error');
            }
        }

        /* Password strength */
        if ($el.hasClass('pass')) {
            if (!this.checkPassStrength($el.val())) {
                $el.addClass('error');
                return false;
            } else {
                $el.removeClass('error');
            }
        }

        if ($el.hasClass('confirm-pass')) {
            return this.checkPassMatch();
        }

        return true;
    },

    validateEmail: function(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },

    checkPassStrength: function(pass) {
        return pass.trim().length > 7;
    },

    checkPassMatch: function() {
        var pass = $(this.el).find('.pass').val();
        var confPass = $(this.el).find('.confirm-pass').val();

        if (pass !== confPass) {
            $(this.el).find('.pass').addClass('error');
            $(this.el).find('.confirm-pass').addClass('error');
            return false;
        } else {
            $(this.el).find('.pass').removeClass('error');
            $(this.el).find('.confirm-pass').removeClass('error');
        }
        return true;
    }
};