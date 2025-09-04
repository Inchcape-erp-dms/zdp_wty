sap.ui.define([
	"sap/m/StandardTreeItem",
	"sap/m/StandardTreeItemRenderer",
], function(Control, Renderer) {

	return Control.extend('encollab.dp.controls.CustomTreeItem', {
		metadata: {
			properties: {
				label: {
					type: 'string'
				}
			}
		},
		renderer: function(elem, control) {
			Renderer.render(elem, control);
		},

		onAfterRendering: function() {
			var $elm = $($('#' + this.getId() + '-content')[0]);
			var html = $elm.html();
			var label = this.getLabel();

			if(label) {
				$elm.html('<span style="font-style:italic;width:200px">' + label + '</span><span style="float:right;">' + html + '</span>');
			} else {
				$elm.html('<span style="font-style:italic;">' + html + '</span>');
			}
		},

		init: function() {
			if (Control.prototype.init) Control.prototype.init.apply(this, arguments);
		}
	});
});