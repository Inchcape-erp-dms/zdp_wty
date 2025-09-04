jQuery.sap.declare("hicron.dp.wty.controls.PartObjectHeader");

sap.m.ObjectHeader.extend("hicron.dp.wty.controls.PartObjectHeader", {
	
    metadata: {
        properties: {
            showOnlyPrefixText: {
                type: "boolean",
                defaultValue: false
            },
            prefixText: {
                type: "string",
                defaultValue: 'SOH'
            }
        },
        aggregations: {
            _objectNumber: { type: "hicron.dp.wty.controls.PartObjectHeader", multiple: false, visibility: "hidden" }
        }
    },

    init: function() {
        sap.m.ObjectHeader.prototype.init.apply(this, arguments);

        this._getObjectNumber().setShowOnlyPrefixText(this.getShowOnlyPrefixText()||false);
        this._getObjectNumber().setPrefixText(this.getPrefixText());
    },

    setShowOnlyPrefixText: function(value) {
        this._getObjectNumber().setShowOnlyPrefixText(value);
        this.showSOH = this._getObjectNumber().getShowOnlyPrefixText();
    },

    setPrefixText: function(value) {
        this._getObjectNumber().setPrefixText(value);
        this.prefixText =  this._getObjectNumber().getPrefixText();
    },

    _getObjectNumber: function() {
        var oControl = this.getAggregation("_objectNumber");

        if (!oControl) {
            oControl = new hicron.dp.wty.controls.PartObjectHeader(this.getId() + "-number", { // eslint-disable-line
                emphasized: false
            });

            this.setAggregation("_objectNumber", oControl, true);
        }
        return oControl;

    },

    renderer: {}

});