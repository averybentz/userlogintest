var AccountController = function (userModel, session, mailer)
{
	this.crypto = require('crypto');
	this.uuid = require('node-uuid');
	this.ApiResponse = require('../models/api-response.js');
	this.ApiMessages = require('../models/api-messages.js');
	this.UserProfileModel = require('../models/user-profile.js');
	this.userModel = userModel;
	this.session = session;
	this.mailer = mailer;
};

AccountController.prototype.getSession = function () {
	return this.session;
};

AccountController.prototype.setSession = function (session) {
	this.session = session;
};

AccountController.prototype.hashPassword = function (hashPassword, salt, callback) {
	// we use pbkdf2 to hash and iterate 10k times by default
	var iterations = 10000,
		keyLen = 64; // 64 bit.
	this.crypto.pbkdf2(password, salt, iterations, keyLen, callback);
};

AccountController.prototype.logon = function(email, password, callback) {

	var me = this;

	me.userModel.findOne({ email: email }, function (err, user) {

		if (err) {
			return callback(err, new me.ApiResponse({ success: false, extras: { msg: me.ApiMessages.DB_ERROR } }));
		}

		if (user) {

			me.hashPassword(password, user.passwordSalt, function (err, passwordHash) {

				if (passwordHash == user.passwordHash) {

					var userProfileModel = new me.UserProfileModel({
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName
					});

					me.session.userProfileModel = userProfileModel;

					return callback(err, new me.ApiResponse({
						success: true, extras: {
							userProfileModel:userProfileModel
						}
					}));
				} else {
					return callback(err, new me.ApiResponse({
						success: false, extras: { msg: me.ApiMessages.INVALID_PWD }
					}));
				}
			});
		} else {
			return callback(err, new me.ApiResponse({ 
				success: false, extras: { msg: me.ApiMessages.EMAIL_NOT_FOUND } 
			}));	
		}
	});
};

AccountController.prototype.logoff = function () {
	if (this.session.userProfileModel) delete
		this.session.userProfileModel;
	return;
};

module.exports = AccountController;