var Login = function(){};

Login.prototype = {
    el: '#login-form',
    events: {
        "submit": "submitLogin"
    },

    initialize: function() {
        $(document).on("login", _.bind(function(ev, email, pass) {
            this.loginUser(email, pass);
        }, this));

        $(this.el).on("submit", _.bind(this.submitLogin, this));
    },

    submitLogin: function(e) {
        e.preventDefault();

        var email = $('#login-email').val();
        var pass = $('#login-password').val();

        this.loginUser(email, pass);
    },

    loginUser: function(email, pass) {
        $.ajax({
            url: "login",
            method: "POST",
            data: {
                email: email,
                password: pass
            },
            dataType: "json",
            success: _.bind(function() {
                $(".invalid-data").addClass("hidden");

                // $(document).find("#login_register_modal").modal("hide");

                window.location.reload();

                console.log ("Logged in");
            }, this),
            error: function(res, err) {
                $(".invalid-data").removeClass("hidden");
                console.log ("Error logging in");
                console.log(err);
            }
        });
    }
};
