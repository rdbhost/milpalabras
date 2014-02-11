/*global $ */
/*jshint unused:false */
var app = app || {};
var ENTER_KEY = 13;
var ESC_KEY = 27;

$(function () {
	'use strict';

    // todo = change this to create overall AppView, which creates ThreadsView

	// kick things off by creating the `App`
	new app.ThreadsView();
});
