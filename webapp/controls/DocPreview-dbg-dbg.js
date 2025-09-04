jQuery.sap.declare("encollab.dp.controls.DocPreview");
// This allows adding a class attribute to the standard control during definition
sap.ui.core.Control.extend("encollab.dp.controls.DocPreview", {
    metadata: {
        properties: {
            url: {
                type: "string"
            }
        }
    },

    init: function() {
        this.addEventDelegate({
            onAfterRendering: $.proxy(this._onAfterRender, this)
        });
    },

    renderer: function(oRm, oControl) {
        oRm.write('<div id="previewContainer" style="width: 100%; height: 800px">');
        oRm.write('<object id="previewObject" width="100%" height="100%" type="application/pdf" data="' + oControl.getUrl() + '">');
        oRm.write('<p>This browser does not support PDFs.</p>');
        oRm.write('</object>');
        oRm.write('</div>');
    },

    _onAfterRender: function(oEvent) {
        var container = $('#previewContainer');

        // TODO - This is to handle inside Dialog box - will need to change later
        container.height(container.parent().parent().parent().height());
    }
});