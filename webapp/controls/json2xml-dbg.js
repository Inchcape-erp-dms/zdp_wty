sap.ui.define([],function(){
/*	This work is licensed under Creative Commons GNU LGPL License.

		License: http://creativecommons.org/licenses/LGPL/2.1/
	    Version: 0.9
		Author:  Stefan Goessner/2006
		Modified by Jorg
		Web:     http://goessner.net/
	*/
return function e(r,t){var n=function(e,r,t){if(r.substr(0,2)==="__")return;if(!isNaN(r))r="Case";var a="";if(e instanceof Array){for(var i=0,f=e.length;i<f;i++)a+=t+n(e[i],r,t+"\t")+"\n"}else if(typeof e=="object"){var s=false;a+=t+"<"+r;for(var c in e){if(c.charAt(0)=="@")a+=" "+c.substr(1)+'="'+e[c].toString()+'"';else s=true}a+=s?">":"/>";if(s){for(var c in e){if(c=="#text")a+=e[c];else if(c=="#cdata")a+="<![CDATA["+e[c]+"]]>";else if(c.charAt(0)!="@")a+=n(e[c],c,t+"\t")}a+=(a.charAt(a.length-1)=="\n"?t:"")+"</"+r+">"}}else{a+=t+"<"+r+">"+e.toString()+"</"+r+">"}return a},a="";for(var i in r)a+=n(r[i],i,"");var f=t?a.replace(/\t/g,t):a.replace(/\t|\n/g,"");return'<?xml version="1.0" encoding="UTF-8"?><Cases>'+f.replace(/>undefined</gi,"><").replace(/&/g,"&amp;")+"</Cases>"}});
//# sourceMappingURL=json2xml-dbg.js.map