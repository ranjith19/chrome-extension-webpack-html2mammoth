import Mammoth from 'mammoth-data-library';
import $ from "jquery";
import _ from "lodash";
const BASE_URL = 'https://eureka.mammoth.io';

let mammoth = new Mammoth(BASE_URL + '/api/v1');
let _mammothRegistry;
let _tableRegistry = {};
let knownTables = [];

init();

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
  _findAllHtmlTables();
  setInterval(_findAllHtmlTables, 5000);
  mammoth.resources.startPolling();
}

function _findAllHtmlTables(){
  let tables = $('table');
  _logData({"init": {"tables": tables.length}})
  $.each(tables, function(i, table){
    handleTable(table)
  });
}


function getNewTableOverlay(id){
  return '<div id="'+ id + '"><span>Feed Mammoth</span></div>'
}

function handleTable(table){
  if(knownTables.indexOf(table) != -1){
    return;
  }
  let tblEle = $(table);
  if(tblEle){
    let headerCols = $(tblEle).find('th');
    let rowElements = $(tblEle).find('tr');

    if(!headerCols.length){
      return;
    }
    if(!rowElements.length){
      return;
    }
    let id = ('mt_' + Math.random()).replace('.', '_');
    _tableRegistry[id] = table;
    knownTables.push(table);
    let p = $(tblEle).offset();
    let w = $(tblEle).width();
    let newOverLay = getNewTableOverlay(id);
    let oEle = $('body').append(newOverLay);
    let oSelector = '#' + id;
    $(oSelector).css({
      top: p.top,
      left: p.left + w + 10,
      boder: '1px solid yellow',
      width: 140,
      height: 30,
      background: '#56c28c',
      position: 'absolute',
      cursor: 'pointer',
      'color': '#000',
      'background-color': '#56c28c',
      'border-color': '#56c28c',
      'text-align': 'center',
      'vertical-align': 'center',
      'borer-radius': '5px',
      'padding': '5px',
      'z-index': 100
    });
    $(oSelector).on("click", getPushHandler(id));
  }
}


function getPushHandler(id){
  return function(){
    let table = _tableRegistry[id];
    $("#" + id).remove();
    pushTable(table);
  }
}

function pushTable(element){
  let data = [];
  let headers = [];
  let internalNames = {};
  let headerRows = $($($(element)[0]).find('thead')).find('tr');
  let lastHeader = headerRows[headerRows.length - 1];
  let headerCols = $(lastHeader).find('th');

  $.each(headerCols, function(i, e){
    let headerText = $(e).text();
    let header = headerText;
    let index = 2;
    while(headers.indexOf(header) != -1){
      header = (headerText + index);
      index++;
    }
    headers.push(header);
    internalNames[header] = 'header' + i;
  });
  let types = {};
  let rowElements = $($($(element)[0])).find('tbody tr');
  $.each(rowElements, function(i, re){
    let row = {};
    let cellElements = $(re).find('td');
    if(cellElements.length == 0){
      return true;
    }
    $.each(cellElements, function(j, ce){
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
  _logData({"headers": headers});
  _logData({types: _.values(types)});
  // console.log("types", types);
  _logData(({"rows ": data.length}));
  let metadata = [];
  $.each(headers, function(i, h){
    let iname = internalNames[h];
    metadata.push({
      display_name: h,
      internal_name: iname,
      type: types[iname]||'TEXT'
    });
  });
  _logData(({"columns ": metadata.length}));
  _addDs();

  function _addDs(){
    mammoth.createDatasetFromJson("HTML table", metadata, data).then(_addDsCb);
  }

  function _addDsCb(dsId){
    console.log("Created dataset with id", dsId);
    _logData({"ds": "success"});
    setTimeout(function(){
      mammoth.getDsById(dsId).then(_getDsCb, _failureCb);
    }, 5000);
  }
  function _failureCb(){
    _logData({"ds": "failure"});
  }

  function _getDsCb(ds){
    ds.listWorkspaces().then(_listWsCb, _failureCb);
  }

  function _listWsCb(list){
    if(list.length){
      _logData({"openWS": 'success'});
        window.open(BASE_URL + '#workspaces/' + list[0].id);
    }
    else{
      _logData({"openWS": 'failure'});
    }
  }
}

function _getCellData(element){
  return $(element).text();
}


function _logData(data){
  $.post('https://qa.mammoth.io/api/v1/webhook/data/DUUcQuKl8WFt', data);
  console.log(data);
}
