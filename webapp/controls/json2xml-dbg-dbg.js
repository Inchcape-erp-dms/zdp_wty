/* jshint ignore:start */
sap.ui.define([], function() {
	/*	This work is licensed under Creative Commons GNU LGPL License.

		License: http://creativecommons.org/licenses/LGPL/2.1/
	    Version: 0.9
		Author:  Stefan Goessner/2006
		Modified by Jorg
		Web:     http://goessner.net/
	*/
	return function json2xml(o, tab) {
		var toXml = function(v, name, ind) {
				if(name.substr(0,2) === '__') return;
				if(!isNaN(name)) name = 'Case';
				var xml = "";
				if (v instanceof Array) {
					for (var i = 0, n = v.length; i < n; i++)
						xml += ind + toXml(v[i], name, ind + "\t") + "\n";
				} else if (typeof(v) == "object") {
					var hasChild = false;
					xml += ind + "<" + name;
					for (var m in v) {
						if (m.charAt(0) == "@")
							xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
						else
							hasChild = true;
					}
					xml += hasChild ? ">" : "/>";
					if (hasChild) {
						for (var m in v) {
							if (m == "#text")
								xml += v[m];
							else if (m == "#cdata")
								xml += "<![CDATA[" + v[m] + "]]>";
							else if (m.charAt(0) != "@")
								xml += toXml(v[m], m, ind + "\t");
						}
						xml += (xml.charAt(xml.length - 1) == "\n" ? ind : "") + "</" + name + ">";
					}
				} else {
					xml += ind + "<" + name + ">" + v.toString() + "</" + name + ">";
				}
				return xml;
			},
			xml = "";
		for (var m in o)
			xml += toXml(o[m], m, "");

		var final = tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
		return '<?xml version="1.0" encoding="UTF-8"?><Cases>' + final.replace(/>undefined</gi, '><').replace(/&/g, '&amp;') + '</Cases>';
	};
});
