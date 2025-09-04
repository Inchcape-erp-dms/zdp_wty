jQuery.sap.declare("encollab.dp.controls.ColumnListItem");
// This allows adding a class attribute to the standard control during definition
sap.m.ColumnListItem.extend("encollab.dp.controls.ColumnListItem", {
    metadata: {
        properties: {
            role: {
                type: "string",
                defaultValue: "Default"
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

            rm.addClass("role" + oLI.getRole());
        }
    }
});
