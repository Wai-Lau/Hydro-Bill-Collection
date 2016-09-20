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
page.onLoadStarted = function() {
    loadInProgress = true;
};
page.onLoadFinished = function() {
    loadInProgress = false;
};

var initialize = [
    function openPage(){
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
    
    function login(){
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

    function getPageType(){        
        var patt = new RegExp("^(My Customer)");
        var title = page.evaluate(function () {return document.title});
        if (patt.test(title)){
            console.log("Login Successful.");
            console.log("Getting page type...");
            page.includeJs(
            "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
                pageType = page.evaluate(
                    function(first, last) {
                        if ($("#select-search-crit").length){
                            document.getElementById("select-search-crit").value = "date-echeance";
                            document.getElementById("datepicker-3").value = first;
                            document.getElementById("datepicker-4").value = last;
                            console.log("Selecting bills...");
                            $(document.getElementById("rech-facture")).find("button[type='submit']").click();
                            return "list";
                        }else{ 
                            if($("p[class='solde']").length == 1){
                                return "single";
                            }else if ($("p[class='solde']").length > 1){
                                return "multi";
                            }else{
                                return "unknown";
                            }
                        }
                    },
                    first, last
                )
            );
            step = -1;
            initialized = true;
            if (pageType != "list")
                loadInProgress = false;
        }else{
            console.log("Login Failed.");
            phantom.exit();
        }
    }
];

var numberOfBills = 0;
var list = [
    function billNumber(){
        page.includeJs(
        "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
            numberOfBills = page.evaluate(
                function() {
                    return $("tbody").find("td[class='acnt  sorting_2']").length;
                }) 
        );
        console.log("Found " + numberOfBills + " bills.");
        loadInProgress = false;
    },
    
    function collect(){
        if (numberOfBills > 0){
            page.includeJs(
            "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
                dataString = page.evaluate(
                    function(numberOfBills, username){
                        var data = [];
                        var billNumbers = ($("tbody").find("td[class='acnt  sorting_2']"));
                        var accountNumbers = ($("tbody").find("td[class='acnt '] a"));
                        var billingDates = ($("tbody").find("td[class='date ']"));
                        var dueDates = ($("tbody").find("td[class='date  sorting_1']"));
                        var amounts = ($("tbody").find("td[class='currency '] span"));
                        for (var i = 0; i < numberOfBills; i++){
                            data.push(new Object());
                            data[i]["account"] = username;
                            data[i]["billNumber"] = billNumbers[i].innerHTML
                                                    .replace(/\D/g,' ').replace(/\s+/g,' ').trim();
                            data[i]["accountNumber"] = accountNumbers[i].innerHTML.replace(/\n|<.*?>/g,'')
                                                        .replace(/\D/g,' ')
                                                        .replace(/-/g,' ').replace(/\s+/g,' ').trim();
                            data[i]["billingDate"] = billingDates[i].innerHTML.trim();
                            data[i]["dueDate"] = dueDates[i].innerHTML.trim();
                            data[i]["amount"] = amounts[i].innerHTML.trim();
                        }
                        try{return JSON.stringify(data);}
                        catch(err){
                            console.log(err);
                            console.log("Stringify Error.");
                            return "";
                        }
                    }, numberOfBills, system.args[1]
                )
            );
            loadInProgress = false;
        }
    },

    function write(){
        //page.render('screenshot.png');
        //console.log("Screenshot!");
        writeToFile(dataString);
        phantom.exit();
    }
];

var single = [
    function collect(){  
        page.includeJs(
        "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
            dataString = page.evaluate(
                function(username, first, last){
                    var data = [];
                    data[0] = {};
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
                    data[0]["account"] = username;
                    data[0]["billNumber"] = "-";                  
                    data[0]["accountNumber"] = $("ul[class='account-contract'] li")[0]
                                        .innerHTML.replace(/\D/g,' ').replace(/\s+/g,' ').trim();
                    data[0]["billingDate"] = "-";
                    if (/\d\d/.test(month) && (year + "-" + month + "-" + day) >= first 
                                           && (year + "-" + month + "-" + day) <= last)
                        data[0]["dueDate"] = year + "-" + month + "-" + day;
                    else 
                        data[0]["dueDate"] = "";
                    data[0]["amount"] = "";
                    $("div[class='cockpit-list'] a").click();
                    console.log("Pulling from archive...");
                    try{return JSON.stringify(data);}
                    catch(err){
                        console.log(err);
                        console.log("Stringify Error.");
                        return "";
                    }
                    }, system.args[1], first, last
            )
        );
    },
    
    function pullFromArchive(){
        page.includeJs(
            "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js",
            dataString = page.evaluate(
                function(current, username, first, last) {
                    var data = [];
                    if ($("tbody")){
                        
                        var billingDates = $("tbody").find("td[class='tblCenter bill-date date  sorting_1']");
                        var amounts = $("tbody").find("span[class='sort-value']");
                        var dueDates = [];
                        
                        for (var i = 0; i < billingDates.length; i++){
                            var year = billingDates[i].innerHTML.trim().split("-")[0];
                            var month = billingDates[i].innerHTML.trim().split("-")[1];
                            var day = billingDates[i].innerHTML.trim().split("-")[2];
                            var d = new Date(year, (month-1), day);
                            d.setDate(d.getDate() + 21);
                            dueDates[i] = "" + parseInt(d.getFullYear()) + "-" 
                                             + ("0" + (parseInt(d.getMonth())+1)).slice(-2) + "-" 
                                             + ("0" + parseInt(d.getDate())).slice(-2);                   
                        }
                        
                        console.log(first);
                        console.log(last);
                        console.log(billingDates[12].innerHTML.trim());
                        console.log(dueDates[12]);
                        
                        if (current)
                            data = JSON.parse(current);
                        
                        console.log(JSON.stringify(data));
                        
                        var temp = data[0].accountNumber;
                        
                        for (var i = 0; dueDates[i]; i++){
                            if(dueDates[i] >= first && dueDates[i] <= last){
                                if (!data[i])
                                    data[i] = (new Object());
                                data[i]["account"] = username;
                                data[i]["billNumber"] = "-";
                                data[i]["accountNumber"] = temp;
                                data[i]["billingDate"] = billingDates[i].innerHTML.trim();
                                data[i]["dueDate"] = dueDates[i];
                                data[i]["amount"] = amounts[i].innerHTML.trim();
                            }
                        }
                        
                        data = data.filter(function(x){
                            return (x !== (null || '' || undefined));
                        });
                        
                        data[0].billingDate = billingDates[0].innerHTML.trim();
                        if (data[0].amount == "")
                            data.shift();
                        console.log(JSON.stringify(data));
                        try{return JSON.stringify(data);}
                        catch(err){
                        console.log(err);
                        console.log("Stringify Error.");
                        return "";
                        }
                    }
                }, dataString, system.args[1], first, last
            ) 
        );
    loadInProgress = false;
    },
    
    function write(){
        writeToFile(dataString);
        phantom.exit();
    }
];


function writeToFile(dataString){
    if(dataString){
        try{
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
                    if(DATA[bill][key])
                        content += ("\"" + DATA[bill][key] + "\"" + ",");
                if(DATA[bill][key])
                    content += "\n";
            }
            fs.write(path, content, 'a');
        }catch(err){
            console.log("Write error.");
            phantom.exit();
        }
    }
}


var dataString, pageType, initialized = false;
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
        d.setDate(d.getDate() + 21);
        var last = parseInt(d.getFullYear()) + "-" + ("0" + (parseInt(d.getMonth() +1))).slice(-2) + "-" + ("0" + parseInt(d.getDate())).slice(-2);
        console.log("Default end: " + last);
    }
    console.log("Starting...");
    var step = 0;
    var interval = setInterval(
            function(){
                if (loadInProgress != true){
                    loadInProgress = true;
                    if (!initialized){
                        initialize[step]();
                    }else{
                        if (pageType == "list")
                            list[step]();
                        else if (pageType == "multi")
                            multi[step]();
                        else if (pageType == "single")
                            single[step]();
                        else{
                            console.log("Page type unknown.");
                            phantom.exit();
                        }
                    }
                    step++;
                }
            }, 
        500); 
}
