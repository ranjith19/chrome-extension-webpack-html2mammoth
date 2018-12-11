import Mammoth from 'mammoth-data-library';
import $ from "jquery";
import _ from "lodash";
const BASE_URL = 'https://eureka.mammoth.io';

let inited = false;
let mammoth = new Mammoth(BASE_URL + '/api/v1');
let _mammothRegistry;
let _elementRegistry = {};
let knownElements = [];
let trackingInfo = {};
let tableLength = {};
let trackingURL = 'https://qa.mammoth.io/api/v1/webhook/data/LW5QcnJDzfS0';

/*
Working spec. This has not been implemented yet.

Spec:
{
  'selector': 'table',
  'handler': handleTable,
  'element': domElement,
  'trackProperties': trackProperties,
  'clickHanker': clickHandler,
  'postioner': positioner
}

*/

let selectorHandlerMap = {
  'table': handleTable,
  "a[href*='.csv']": handleSupportedFileLinks,
  "a[href*='.json']": handleSupportedFileLinks,
  "a[href*='.xlsx']": handleSupportedFileLinks,
  "a[href*='.xls']": handleSupportedFileLinks,
  "a[href*='.zip']": handleSupportedFileLinks,
  "ul": handleLists,
  "ol": handleLists
}

_captureBrowserDetails();
init();
addSheetAndRules();

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        switch(message.type) {
            case "status":
                sendResponse(null);
                init();
            break;
        }
    }
);

function init(){
  chrome.storage.local.get('_mammothRegistry', function (items) {
      _mammothRegistry = items._mammothRegistry;
      if(_mammothRegistry && _mammothRegistry.token && _mammothRegistry.account && _mammothRegistry.account.id){
        mammoth.setTokenAccountId(
          _mammothRegistry.token, _mammothRegistry.account.id).then(_setTokenAccountCb);
      }
  });
}

function _setTokenAccountCb(){
  // console.log(_mammothRegistry);
  _findAllHtmlElements();
  setInterval(_findAllHtmlElements, 5000);
}

function _findAllHtmlElements(){
  let totalElements = {};
  _.forEach(selectorHandlerMap, function(handler, selector){
    let matchingElements = $(selector);
    totalElements[selector] = matchingElements.length;
    $.each(matchingElements, function(i, mEle){
      handler(mEle)
    });
  });

  if(!inited){
      _logData("init", totalElements);
  }
  inited = true;
}


function getNewElementOverlay(properties){
  let template = '<div class="html-to-mammoth-push-button-2" id="${ id }" data-after-content="${ content }"></div>';
  return _.template(template)(properties);
}

function handleSupportedFileLinks(aLink){
  if(knownElements.indexOf(aLink) != -1){
    return;
  }
  let aEle = $(aLink);
  if(aEle){
    let id = ('anchor_' + Math.random()).replace('.', '_');
    _elementRegistry[id] = aEle;
    knownElements.push(aLink);
    let p = $(aEle).offset();
    let w = $(aEle).width();
    let newOverLay = getNewElementOverlay({
      id: id,
      content: 'File ➢ Mammoth'
    });
    let oEle = $('body').append(newOverLay);
    let oSelector = '#' + id;
    $(oSelector).css({
      top: p.top + 20,
      left: p.left,
      'z-index': 100 + knownElements.length
    });
    $(oSelector).on("click", getFilePushHandler(id));
  }
}

function handleLists(listEle){
  if(knownElements.indexOf(listEle) != -1){
    return;
  }
  let ulEle = $(listEle);
  if(ulEle){
    let id = ('ul_' + Math.random()).replace('.', '_');
    _elementRegistry[id] = ulEle;
    knownElements.push(listEle);
    let p = $(listEle).offset();
    let w = $(listEle).width();
    let totalItems = $(listEle).children().length;
    if(totalItems <= 1){
      return;
    }
    let newOverLay = getNewElementOverlay({
      id: id,
      content: totalItems + ' items ➢ Mammoth'
    });
    let oEle = $('body').append(newOverLay);
    let oSelector = '#' + id;
    $(oSelector).css({
      top: p.top,
      left: p.left + w,
      'z-index': 100 + knownElements.length
    });
    $(oSelector).on("click", getListPushHandler(id));
    _fixPosition(oSelector);
  }
}

function _fixPosition(ele){
  let wd = $(window).width();
  let el = $(ele).offset().left;
  if(wd < el + 200){
    $(ele).css({left: el - 200});
  }
}

function getListPushHandler(id){
  return function(){
    let ele = _elementRegistry[id];
    $("#" + id).remove();
    pushListToMammoth(ele);
  }
}

function getFilePushHandler(id){
  return function(){
    let aEle = _elementRegistry[id];
    $("#" + id).remove();
    pushFileLink(aEle);
  }
}




function handleTable(table){
  if(knownElements.indexOf(table) != -1){
    return;
  }
  let tblEle = $(table);
  if(tblEle){
    let headerCols = $(tblEle).find('th');
    let rowElements = $(tblEle).find('tbody');

    if(!(rowElements.length)){
      return;
    }
    let totalRows = $(tblEle).find('tbody tr').length;
    let id = ('mt_' + Math.random()).replace('.', '_');
    _elementRegistry[id] = table;
    knownElements.push(table);
    let p = $(tblEle).offset();
    let w = $(tblEle).width();
    let content = '' + totalRows + ' rows ➢ Mammoth';
    let newOverLay = getNewElementOverlay({
      id: id,
      content: content
    });
    let oEle = $('body').append(newOverLay);
    let oSelector = '#' + id;
    $(oSelector).css({
      top: p.top,
      left: p.left + w - 60,
      'z-index': 100 + knownElements.length
    });
    $(oSelector).on("click", getTablePushHandler(id));
    _fixPosition(oSelector);
  }
}


function getTablePushHandler(id){
  return function(){
    let table = _elementRegistry[id];
    $("#" + id).remove();
    pushTable(table);
  }
}


function pushFileLink(aEle){
  let linkToFile = $(aEle).prop('href');
  mammoth.uploadFileByCsvLink(linkToFile).then(_openApp);
  let details = {
    "fileLink ": linkToFile,
    'url': window.location.href,
    "element": 'anchor',
    "runId": Math.random()
  };
  _logData("click", details);
  function _failureCb(){
    _logData("failure", details);
  }
  function _openApp(){
    _logData("success", details);
    window.open(BASE_URL + '/#/landing/home');
  }
}


function pushTable(element){
  let data = [];
  let headers = [];
  let internalNames = {};

  function addHeader(headerText){
    let header = headerText;
    let index = 2;
    while(headers.indexOf(header) != -1){
      header = (headerText + index);
      index++;
    }
    headers.push(header);
    internalNames[header] = 'header' + headers.length;
  }

  let headerRows = $($($(element)[0]).find('thead')).find('tr');
  if (headerRows.length){
    let lastHeader = headerRows[headerRows.length - 1];
    let headerCols = $(lastHeader).find('th');
    $.each(headerCols, function(i, e){
      let headerText = $(e).text().trim();
      if(headerText.length == 0){
        headerText = 'Header';
      }
      addHeader(headerText);
    });
  }

  let types = {};
  let rowElements = $($($(element)[0])).find('tbody tr');
  $.each(rowElements, function(i, rele){
    let row = {};
    let cellElements = $(rele).children();
    if(cellElements.length == 0){
      return true;
    }
    $.each(cellElements, function(j, ce){
      if(j >= headers.length){
        let hText = 'Header ' + (j + 1);
        addHeader(hText);
      }
      let h = headers[j];
      let iname = internalNames[h];
      let cd = _getCellData(ce);
      cd = cd.trim();
      if(cd == ""){
        cd = null;
      }
      if(cd == '""'){
        cd  = null;
      }
      if(cd !== null){
        if(isNaN(cd)){
          types[iname] = 'TEXT';
        }
        else{
          types[iname] = types[iname] || 'NUMERIC';
        }
      }
      if(types[iname] == 'NUMERIC' && cd !== null){
        row[iname] = parseFloat(cd);
      }
      else{
          row[iname] = cd;
      }
    });
    if(Object.keys(row).length){
        data.push(row);
    }
  });
  let metadata = [];
  $.each(headers, function(i, h){
    let iname = internalNames[h];
    metadata.push({
      display_name: h,
      internal_name: iname,
      type: types[iname]||'TEXT'
    });
  });
  let tableDetails = {
    "rows ": data.length,
    "columns ": metadata.length,
    'url': window.location.href,
    "element": 'table',
    "runId": Math.random()
  };
  _logData("click", tableDetails);
  if(data.length){
      addDataset(metadata, data, tableDetails);
  }
}

function addDataset(metadata, data, details){
  if(!details){
    details = {};
  }
  _addDs();
  mammoth.resources.startPolling();

  function _addDs(){
    let dsName = getCleanPageTitle();
    if(parseInt(dsName[0]) == dsName[0]){
      dsName = "Dataset " + dsName;
    }
    dsName = dsName.substring(0, 50);
    mammoth.createDatasetFromJson(dsName, metadata, data).then(_addDsCb);
  }

  function _addDsCb(dsId){
    setTimeout(function(){
      mammoth.getDsById(dsId).then(_getDsCb, _failureCb);
    }, 5000);
  }

  function _failureCb(){
    _logData("failure", details);
    mammoth.resources.stopPolling();
  }

  function _getDsCb(ds){
    ds.listWorkspaces().then(_listWsCb, _failureCb);
  }

  function _listWsCb(list){
    if(list.length){
      _logData("success", details);
      window.open(BASE_URL + '/#workspaces/' + list[0].id);
      mammoth.resources.stopPolling();
    }
    else{
      _failureCb();
    }
  }
}

function getCleanPageTitle() {
  let pageTitle = document.title;
  return pageTitle.replace(/[^\w\s]/gi, '');
}

function pushListToMammoth(listEle){
  let metadata = [{
      'internal_name': 'sequence',
      'display_name': "Sequence",
      'type': 'NUMERIC'
    },{
      'internal_name': 'item',
      'display_name': "Items",
      'type': 'TEXT'
  }];
  let data = [];
  let items = $(listEle).find('li');
  $.each(items, function(i, item){
    data.push({sequence: i + 1, item: $(item).text().trim()});
  })
  console.log(data, metadata);
  addDataset(metadata, data, {
    "rows ": data.length,
    "columns ": metadata.length,
    'url': window.location.href,
    "element": 'list',
    "runId": Math.random()
  })
}

function _getCellData(element){
  return $(element).text();
}

function _captureBrowserDetails(){
  var nVer = navigator.appVersion;
  var nAgt = navigator.userAgent;
  var browserName  = navigator.appName;
  var fullVersion  = ''+parseFloat(navigator.appVersion);
  var majorVersion = parseInt(navigator.appVersion,10);
  var nameOffset,verOffset,ix;

  // In Opera, the true version is after "Opera" or after "Version"
  if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
   browserName = "Opera";
   fullVersion = nAgt.substring(verOffset+6);
   if ((verOffset=nAgt.indexOf("Version"))!=-1)
     fullVersion = nAgt.substring(verOffset+8);
  }
  // In MSIE, the true version is after "MSIE" in userAgent
  else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
   browserName = "Microsoft Internet Explorer";
   fullVersion = nAgt.substring(verOffset+5);
  }
  // In Chrome, the true version is after "Chrome"
  else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
   browserName = "Chrome";
   fullVersion = nAgt.substring(verOffset+7);
  }
  // In Safari, the true version is after "Safari" or after "Version"
  else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
   browserName = "Safari";
   fullVersion = nAgt.substring(verOffset+7);
   if ((verOffset=nAgt.indexOf("Version"))!=-1)
     fullVersion = nAgt.substring(verOffset+8);
  }
  // In Firefox, the true version is after "Firefox"
  else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
   browserName = "Firefox";
   fullVersion = nAgt.substring(verOffset+8);
  }
  // In most other browsers, "name/version" is at the end of userAgent
  else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) <
            (verOffset=nAgt.lastIndexOf('/')) )
  {
   browserName = nAgt.substring(nameOffset,verOffset);
   fullVersion = nAgt.substring(verOffset+1);
   if (browserName.toLowerCase()==browserName.toUpperCase()) {
    browserName = navigator.appName;
   }
  }
  // trim the fullVersion string at semicolon/space if present
  if ((ix=fullVersion.indexOf(";"))!=-1)
     fullVersion=fullVersion.substring(0,ix);
  if ((ix=fullVersion.indexOf(" "))!=-1)
     fullVersion=fullVersion.substring(0,ix);

  majorVersion = parseInt(''+fullVersion,10);
  if (isNaN(majorVersion)) {
   fullVersion  = ''+parseFloat(navigator.appVersion);
   majorVersion = parseInt(navigator.appVersion,10);
  }


  var OSName="Unknown OS";
  if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
  if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
  if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
  if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";


  trackingInfo = {
    'Browser name':browserName,
    'Full version':fullVersion,
    'Major version':majorVersion,
    'navigator appName':navigator.appName,
    'navigator userAgent':navigator.userAgent,
    'OSName': OSName,
    'initial_url': window.location.href
  }
}



function _logData(event, properties){
  let data = {
    event: event,
    properties: properties,
    tracking: trackingInfo
  }
  $.ajax({
    url: trackingURL,
    type: 'POST',
    dataType: "json",
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data)
  });
  console.log(data);
}


function  addSheetAndRules(){
  var sheet = (function() {
	// Create the <style> tag
  	var style = document.createElement("style");

  	// Add a media (and/or media query) here if you'd like!
  	// style.setAttribute("media", "screen")
  	// style.setAttribute("media", "only screen and (max-width : 1024px)")

  	// WebKit hack :(
  	style.appendChild(document.createTextNode(""));

  	// Add the <style> element to the page
  	document.head.appendChild(style);

  	return style.sheet;
  })();

  sheet.insertRule(`
    .html-to-mammoth-push-button {
      	width: 140px;
      	height: 20px;
      	background: rgb(86, 194, 140);
      	position: absolute;
      	cursor: pointer;
      	color: rgb(0, 0, 0);
      	border-color: rgb(86, 194, 140);
      	text-align: center;
      	padding: 3px;
    }`);

  sheet.insertRule(
    `.html-to-mammoth-push-button-2 {
      	background-color: rgb(86, 0, 140); //rgb(86, 194, 140);
      	border-radius: 3px;
      	color: #fff;
      	cursor: pointer;
      	display: inline-block;
      	font-family: Arial!important;
      	font-size: 12px;
      	font-weight: 700;
      	line-height: 14px;
      	list-style-image: none;
      	list-style-position: outside;
      	list-style-type: none;
      	padding: 2px;
        padding-right: 5px;
        position: absolute;
      	text-align: center;
      	text-decoration-color: rgb(255, 255, 255);
      	text-decoration-line: none;
      	text-decoration-style: solid;
      	text-shadow: rgba(0, 0, 0, 0.25) 0px -1px 0px;
      	text-size-adjust: 100%;
      	vertical-align: baseline;
      	white-space: nowrap;
        width: auto;
        height: auto;
        z-index: 101;
        box-shadow: 0 4px 8px 0 rgba(0,0,0,0.12), 0 2px 4px 0 rgba(0,0,0,0.08);
    }`
  );
  sheet.insertRule(`
    .html-to-mammoth-push-button-2:hover {
      z-index: 10000 !important;
      box-shadow: 0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08);
      padding-right: 2px;
    }
  `)
  sheet.insertRule(`
    .html-to-mammoth-push-button-2:after {
      content: \"+M\";
    }
  `)
  sheet.insertRule(`
    .html-to-mammoth-push-button-2:hover:after {
      content: attr(data-after-content);
    }
  `)
}
