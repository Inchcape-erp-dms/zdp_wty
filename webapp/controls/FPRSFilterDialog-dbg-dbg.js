sap.ui.define([
	'sap/m/ViewSettingsDialog',
	'sap/m/ViewSettingsDialogRenderer'
], function(Control, Renderer) {

	return Control.extend("encollab.dp.controls.FPRSFilterdialog", {
		init: function() {
			Control.prototype.init.apply(this, arguments);
		},

		renderer: function(elem, control) {
			Renderer.render(elem, control);

			if(this._resetButton) this._resetButton.setVisible(true);
		},

		open: function() {
			Control.prototype.open.apply(this, arguments);

			//holy shit, in the open method? where are all the events
			this._resetButton.setVisible(true);
		},

		_switchToPage: function(which, item) {
			Control.prototype._switchToPage.apply(this, arguments);

			//like the 'open' method only worse.
			this._resetButton.setVisible(true);

			$.each(this.getAggregation('customTabs'), function(i, a) {
				if(a.getId() === which) this.setTitle(a.getTitle());
			}.bind(this));
		}
	});
});
