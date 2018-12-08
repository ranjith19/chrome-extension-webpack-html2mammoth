import Mammoth from 'mammoth-data-library';
import $ from "jquery";

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
  // setInterval(_findAllHtmlTables, 10000);
  mammoth.resources.startPolling();
  _findAllHtmlTables();
}

function _findAllHtmlTables(){
  let tables = $('table');
  $.each(tables, function(i, table){
    handleTable(table)
  });
}


function getNewTableOverlay(id){
  return '<div id="'+ id + '">Push to Mammoth</div>'
}

function handleTable(table){
  if(knownTables.indexOf(table) != -1){
    return;
  }
  knownTables.push(table);
  let tblEle = $(table);
  if(tblEle){
    let id = ('mt_' + Math.random()).replace('.', '_');
    _tableRegistry[id] = table;
    let p = $(tblEle).position();
    let w = $(tblEle).width();
    let newOverLay = getNewTableOverlay(id);
    let oEle = $('body').append(newOverLay);
    let oSelector = '#' + id;
    $(oSelector).css({
      top: p.top,
      left: p.left + w + 10,
      boder: '1px solid',
      width: 140,
      height: 20,
      background: 'yellow',
      position: 'absolute',
      cursor: 'pointer'
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
  let headerCols = $(element).find('th');
  $.each(headerCols, function(i, e){
    let header = $(e).html();
    headers.push(header);
    internalNames[header] = 'header' + i;
  });
  let types = {};
  let rowElements = $(element).find('tr');
  $.each(rowElements, function(i, re){
    let row = {};
    let cellElements = $(re).find('td');
    $.each(cellElements, function(j, ce){
      let h = headers[j];
      let iname = internalNames[h];

      let cd = _getCellData(ce);
      if(parseFloat(cd) == cd){
        cd = parseFloat(cd);
        if(types[iname] != 'TEXT'){
          types[iname] = 'NUMERIC';
        }
      }
      else{
        types[iname] = 'TEXT';
      }
      row[iname] = cd;
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
      type: types[iname]
    });
  });

  // chrome.storage.local.get('_mammothRegistry', function (items) {
  //     _mammothRegistry = items._mammothRegistry;
  //     if(_mammothRegistry && _mammothRegistry.token && _mammothRegistry.account && _mammothRegistry.account.id){
  //       mammoth.setTokenAccountId(
  //         _mammothRegistry.token, _mammothRegistry.account.id).then(_addDs);
  //     }
  // });
  _addDs();

  function _addDs(){
    mammoth.createDatasetFromJson("dataset", metadata, data).then(_addDsCb);
  }

  function _addDsCb(dsId){
    console.log(dsId);
    setTimeout(function(){
      mammoth.getDsById(dsId).then(_getDsCb);
    }, 5000);
  }

  function _getDsCb(ds){
    ds.listWorkspaces().then(_listWsCb);
  }

  function _listWsCb(list){
    if(list.length){
        window.open(BASE_URL + '#workspaces/' + list[0].id);
    }

  }
}

function _getCellData(element){
  return $(element)
        .clone()    //clone the element
        .children() //select all the children
        .remove()   //remove all the children
        .end()  //again go back to selected element
        .text();
}
