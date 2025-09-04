sap.ui.define([
    "sap/m/Button",
    "sap/m/ButtonRenderer",
    "sap/m/MessageToast",
    "sap/m/ButtonType",
    "encollab/dp/controls/FileSaver"
], function(Button, Renderer, Msg, ButtonType, FileSaver) {

    return Button.extend("encollab.dp.controls.DownloadButton", {
        metadata: {
            properties: {
                data: {
                    type: 'string'
                },
                name: {
                    type: "string",
                    defaultValue: "myfile.csv"
                }
            }
        },

        renderer: function(elem, control) {
            Renderer.render(elem, control);
        },
        onAfterRendering: function() {
            this._checkAvailabiliy();

            this.setIcon('sap-icon://download-from-cloud');
        },
        init: function() {
            this.attachPress(this._onPress.bind(this));
        },
        _checkAvailabiliy: function() {
            var supported = false;
            try {
              /* jshint ignore:start */
                supported = !!new Blob;
              /* jshint ignore:end */
            } catch (e) {}

            if (supported !== true) {
                this.setEnabled(false);
            }
        },
        _onPress: function() {
            this._download(this.getData());
        },
        _download: function(data) {
            var blob = new Blob([data], {
                type: "data:text/csv;charset=utf-8"
            });
            FileSaver(blob, this.getName());
        }
    });
});
