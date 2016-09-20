"use strict";

var loadInProgress = false;
var page = require('webpage').create(),
    system = require('system'),
    t, address;
page.viewportSize = {
  width: 1920,
  height: 1080
};
page.settings.userAgent = "Mozilla/5.0 (Windows NT 6.0) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.41 Safari/535.1";
page.settings.javascriptEnabled = true;
page.settings.loadImages = false;

page.onConsoleMessage = function(msg) {
    console.log(msg);
};

var action = [
    
    function(){
    address = "https://www.hydroquebec.com/portail/en/web/clientele/authentification";
        page.open(address, function (status) {
            if (status !== 'success') {
                console.log('FAIL to load the address');
                phantom.exit();
            } else {
                console.log('Page Loaded. \n' + page.evaluate(function () {
                    return document.title;
                }));      
            }
        });
    },
    
    function(){
        var account = system.args[1].toString();
        var password = system.args[2].toString();
        page.includeJs(
        "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js", 
            page.evaluate(
                function(account, password) {
                    document.getElementById("account").value = account;
                    document.getElementById("password").value = password;
                    $("button[type='submit']").click();
                    console.log("Logging in...");
                },
                account, password
            )
        );
    },

    function(){        
        var patt = new RegExp("^(My Customer)");
        var title = page.evaluate(function () {return document.title});
        if (patt.test(title)){
            console.log("Login Successful.")
            var more;
            page.includeJs(
            "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
                more = page.evaluate(
                        function(first, last) {
                            if ($("#select-search-crit").length){
                                document.getElementById("select-search-crit").value = "date-echeance";
                                document.getElementById("datepicker-3").value = first;
                                document.getElementById("datepicker-4").value = last;
                                console.log("Selecting bills...");
                                $(document.getElementById("rech-facture")).find("button[type='submit']").click();
                                return true;
                            }else {
                                return false;
                            }
                        },
                    first, last
                    )
            );
            if (!more){  
                console.log("Selecting bills...");
                page.includeJs(
                "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
                    dataString = page.evaluate(
                        function(username){
                            var data = [];
                            data[0] = {};
                            data[0]["account"] = username;
                            data[0]["billNumber"] = "-";
                            data[0]["accountNumber"] = $("ul[class='account-contract'] li")[0].innerHTML.replace(/\D/g,' ').replace(/\s+/g,' ').trim();
                            var temp = $("span[class='text-responsive-pa']")[0].innerHTML.split(';')[1].trim();
                            temp = temp.split(" ");
                            var month = temp[0];
                                if (month == "January")
                                    month = "01";
                                if (month == "February")
                                    month = "02";
                                if (month == "March")
                                    month = "03";
                                if (month == "April")
                                    month = "04";
                                if (month == "May")
                                    month = "05";
                                if (month == "June")
                                    month = "06";
                                if (month == "July")
                                    month = "07";
                                if (month == "August")
                                    month = "08";
                                if (month == "September")
                                    month = "09";
                                if (month == "October")
                                    month = "10";
                                if (month == "November")
                                    month = "11";
                                if (month == "December")
                                    month = "12";
                            var day = temp[1].replace(/\D/g,'');
                            if (day.length == 1)
                                day = "" + 0 + day;
                            var year = temp[2].replace(/\D/g,'');
                            data[0]["billingDate"] = "-";
                            data[0]["dueDate"] = year + "-" + month + "-" + day;                       
                            data[0]["amount"] = $("p[class='solde']")[0].innerHTML.trim();
                            return JSON.stringify(data);
                        }, system.args[1]
                    )
                );
                console.log("Single bill...");
                writeToFile(dataString);
                phantom.exit();
            }                
        }else{
            console.log("Login Failed.");
            phantom.exit();
        }
    },
    
    function(){
        var numberOfBills;
        page.includeJs(
        "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
            numberOfBills = page.evaluate(
                function() {
                    return $("tbody").find("td[class='acnt  sorting_2']").length;
                }) 
        );
        console.log("Found " + numberOfBills + " bills.");
        
        page.includeJs(
        "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
            dataString = page.evaluate(
                function(numberOfBills, username){
                    var data = [];
                    for (var i = 0; i < numberOfBills; i++)
                        data.push(new Object());
                    for (var i = 0; i < numberOfBills; i++){
                        data[i]["account"] = username;
                        data[i]["billNumber"] = ($("tbody").find("td[class='acnt  sorting_2']")[i].innerHTML.replace(/\D/g,' ')
                                                                                                .replace(/\s+/g,' ').trim());
                        data[i]["accountNumber"] = ($("tbody").find("td[class='acnt '] a")[i].innerHTML.replace(/\n|<.*?>/g,'').replace(/\D/g,' ').
                                                                                            replace(/-/g,' ').replace(/\s+/g,' ').trim());
                        data[i]["billingDate"] = ($("tbody").find("td[class='date ']")[i].innerHTML.trim());
                        data[i]["dueDate"] = ($("tbody").find("td[class='date  sorting_1']")[i].innerHTML.trim());
                        data[i]["amount"] = ($("tbody").find("td[class='currency '] span")[i].innerHTML.trim());
                    }
                    return JSON.stringify(data);
                }, numberOfBills, system.args[1]
            )
        );
        loadInProgress = false;
    },
    
    function(){
        //page.render('screenshot.png');
        //console.log("Screenshot!");
        writeToFile(dataString);
        phantom.exit();
    }
    
];

function writeToFile(dataString){
    var path = "out.csv";
    var content = "";
    var DATA = JSON.parse(dataString);
    console.log("Writing to file...");
    var fs = require('fs');
    try{
        fs.read(path);
    }catch(err){
        content = "Account,Bill Number,Account Number,Billing Date,Due Date,Amount,\n";
    }

    for (var bill in DATA){
        for (var key in DATA[bill])
            content += ("\"" + DATA[bill][key] + "\"" + ",");
        content += "\n";
    }
    fs.write(path, content, 'a');
}


var dataString;
var datePatt = new RegExp('^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$');
if (system.args.length !== 3 && system.args.length !== 5) {
    console.log('Usage: access.js <username> <password>');
    console.log('Usage: access.js <username> <password> <begin date> <end date>');
    phantom.exit(1);
} else if (system.args.length === 5 && 
          (!datePatt.test(system.args[3].toString())
           ||
           !datePatt.test(system.args[4].toString()))
          ){
    console.log(system.args[3].toString());
    console.log(system.args[4].toString());
    console.log("Date Format: <YYYY-MM-DD>");
    phantom.exit(1);
} else {
    if (system.args.length === 5){
        var first = system.args[3].toString();
        var last = system.args[4].toString();
    }else{
        var d = new Date();
        var first = parseInt(d.getFullYear()) + "-" + ("0" + (parseInt(d.getMonth() +1))).slice(-2) + "-" + ("0" + parseInt(d.getDate())).slice(-2);
        console.log("Default start: " + first);
        d.setDate(d.getDate() + 20);
        var last = parseInt(d.getFullYear()) + "-" + ("0" + (parseInt(d.getMonth() +1))).slice(-2) + "-" + ("0" + parseInt(d.getDate())).slice(-2);
        console.log("Default end: " + last);
    }
    console.log("Starting...");
    var actionCount = 0;
    var interval = setInterval(
                function(){
                    if (loadInProgress != true){
                        loadInProgress = true;
                        action[actionCount]();
                        actionCount++;
                    }
                }, 
            100); 
}

page.onConsoleMessage = function(msg) {
    console.log(msg);
};
page.onLoadStarted = function() {
    loadInProgress = true;
};
page.onLoadFinished = function() {
    loadInProgress = false;
};
