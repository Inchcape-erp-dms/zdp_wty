jQuery.sap.declare("encollab.dp.controls.PartObjectNumber");

sap.m.ObjectNumber.extend("encollab.dp.controls.PartObjectNumber", {
    metadata: {
        properties: {
            showOnlyPrefixText: {
                type: "boolean"
            },
            prefixText: {
                type: "string"
            }
        },
        aggregations: {}
    },

    renderer: {
        renderText: function(oRm, oON) {
            if (oON.getPrefixText().length > 0) {
                oRm.write("<span");
                oRm.addClass("sapMObjectNumberText");
                oRm.addClass("sapMObjectNumberStatusError");
                oRm.writeClasses();
                oRm.write(">");
                oRm.writeEscaped(oON.getPrefixText());
                oRm.write("</span>&nbsp;");
            }
            if (!oON.getShowOnlyPrefixText()) {
                oRm.write("<span");
                oRm.addClass("sapMObjectNumberText");
                oRm.writeClasses();
                oRm.write(">");
                oRm.writeEscaped(oON.getNumber());
                oRm.write("</span>");
            }
        }
    }

});