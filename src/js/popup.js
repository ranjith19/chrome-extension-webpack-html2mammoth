import "../css/popup.css";
import hello from "./popup/example";
import Mammoth from 'mammoth-data-library';
import $ from "jquery";
import _ from "lodash";

const BASE_URL = 'https://app.mammoth.io';
let mammoth = new Mammoth(BASE_URL + '/api/v1');
let _mammothRegistry = {accounts: null};



chrome.storage.local.get('_mammothRegistry', function (items) {
    let _mammothRegistry = items._mammothRegistry;
    if(_mammothRegistry && _mammothRegistry.token && _mammothRegistry.account && _mammothRegistry.account.id){
      mammoth.setTokenAccountId(
        _mammothRegistry.token, _mammothRegistry.account.id).then(_setAccountName);
      showSection('landing');
      console.log("Arleady logged in")
    }
    else{
      showSection('login');
      console.log("please log in")
    }
});


function showSection(section){
  if(section == 'landing'){
    $(".login").addClass('hide');
    $(".landing").removeClass('hide');
  }
  else{
    $(".login").removeClass('hide');
    $(".landing").addClass('hide');
  }
}

$("#loginButton").click(login);
$("#logout").click(logout);

function logout(){
  showSection('login');
  chrome.storage.local.set({
   '_mammothRegistry': null
  });
}

function login(){
  var email = $("#email").val();
  var password = $("#password").val();
  console.log(email, password);
  mammoth.login(email, password).then(_loginCb, _loginFailure);
}

function _loginFailure(){
  alert("Wrong email and password");
}

function _loginCb(){
  _mammothRegistry['token'] = mammoth.token;
  showSection('landing');
  console.log("logged in");
  mammoth.listAccounts().then(_listAccountCb);
}

function _listAccountCb(accounts){
  _mammothRegistry['accounts'] = accounts;
  _setAccountCb(accounts[0]);
}

function _setAccountCb(account){
  _mammothRegistry['account'] = account;
  mammoth.setAccountId(account.id).then(_setRegistry);
}

function _setRegistry(){
  chrome.storage.local.set({
   '_mammothRegistry': _mammothRegistry
 }, _setAccountName);
}

function _setAccountName(){
  chrome.storage.local.get('_mammothRegistry', function (items) {
    let accounts = items._mammothRegistry.accounts;
    let selectedAccount = items._mammothRegistry.account;
    console.log(accounts, selectedAccount);
    let accContent = "";
    _.forEach(accounts, function(acc){
      let accStr = _.template('<div class="account" id="acc-${id}">${name}</div>')(acc);
      accContent += accStr;
    });
    $("#accountList").html(accContent)
    $("#acc-" + selectedAccount.id).addClass('selected');
    $(".account").click(_accountClickCb);
  });
}

function _accountClickCb(event){
  let target = $(event.target);
  let tId = target.attr('id');
  let accountId = parseInt(tId.split('-')[1]);
  chrome.storage.local.get('_mammothRegistry', function (items) {
    let accounts = items._mammothRegistry.accounts;
    let account = _.find(accounts, {id: accountId});
    console.log(accountId, account);
    if(account){
        _setAccountCb(account);
    }
  });
}


function _broadCast(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type:"status"}, function(response){
    });
  });
}
