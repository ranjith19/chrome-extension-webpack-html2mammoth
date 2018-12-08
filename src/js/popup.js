import "../css/popup.css";
import hello from "./popup/example";
import Mammoth from 'mammoth-data-library';
import $ from "jquery";

let mammoth = new Mammoth('https://eureka.mammoth.io/api/v1');

let _registry = {accounts: null};

function _loginCb(){
  _registry['token'] = mammoth.token;
  mammoth.listAccounts().then(_listAccountCb);
}

function _listAccountCb(accounts){
  _registry['accounts'] = accounts;
  _registry['account'] = accounts[0];
  mammoth.setAccountId(accounts[0].id).then(_setAccountCb);
}

function _setAccountCb(){
  _setRegistry();
  _setAccountName();
}

function _setRegistry(){
  chrome.storage.local.set({
   '_mammothRegistry': _registry
  });
}

function _setAccountName(){
  chrome.storage.local.get('_mammothRegistry', function (items) {
      $("#accountName").html(items._mammothRegistry.account.name);
  });
}

chrome.storage.local.get('_mammothRegistry', function (items) {
    let _mammothRegistry = items._mammothRegistry;
    console.log(_mammothRegistry);
    if(_mammothRegistry && _mammothRegistry.token && _mammothRegistry.account && _mammothRegistry.account.id){
      mammoth.setTokenAccountId(
        _mammothRegistry.token, _mammothRegistry.account.id).then(_setAccountName);
    }
    else{
      mammoth.login('ranjith@mammoth.io', 'datasource19').then(_loginCb);
    }
});
