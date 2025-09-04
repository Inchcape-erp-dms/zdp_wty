jQuery.sap.declare("encollab.dp.controls.SupercessionListItem");

sap.m.ColumnListItem.extend("encollab.dp.controls.SupercessionListItem", {
    metadata: {
        properties: {
            supercessionRole: {
                type: "string",
                defaultValue: "Ancestor"
            }
        }
    },

    renderer: {

        renderLIAttributes: function(rm, oLI) {
            rm.addClass("sapMListTblRow");
            var vAlign = oLI.getVAlign();
            if (vAlign != sap.ui.core.VerticalAlign.Inherit) {
                rm.addClass("sapMListTblRow" + vAlign);
            }

            rm.addClass("super" + oLI.getSupercessionRole());
        }
    }
});
