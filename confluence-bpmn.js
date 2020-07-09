//Changes in bpmn-navigated-viewer.development.js :
//1. ZoomScroll.prototype._handleWheel 19856

//minifiing by https://jscompress.com/



const PAGE_ID = AJS.params.pageId; //ID of the current page
const ATTACHEMENTS_LINKS = getCurrentPageAttachementUrl();
const SOURCE_PAGE_ID = getSourcePageId(); //'182180480';
const DEFAULT_FILENAME = "diagram.bpmn"; //name used while saving a new schema-file
const BPMN_PROPERTIES = { //vars for properties extending BPMN 2.0:
    url: 'url', //name of the property in bpmn-xml for url.
    processId: 'process_id' //name of the property in bpmn-xml for process_id. Process_id is using to link to another process from the processListName list
}
const MUTED_TYPES = [ //array of bpmn-element types. Comment lines below to prohibit users to comment the special bpmn-elements
//comment and uncomment lines below as you wish
  "bpmn:Process",
  //"bpmn:Collaboration",
  //"bpmn:Participant",
  //"bpmn:Lane",
  "bpmn:DataOutputAssociation",
  "bpmn:DataInputAssociation",
  "bpmn:SequenceFlow",
  "bpmn:MessageFlow",
  "bpmn:Association",
  //"bpmn:Task",
  //"bpmn:ServiceTask",
  //"bpmn:SubProcess",
  //"bpmn:DataObjectReference",
  //"bpmn:DataStoreReference",
  //"bpmn:ExclusiveGateway",
  //"bpmn:EventBasedGateway",
  //"bpmn:ParallelGateway",
  //"bpmn:TextAnnotation",
  //"bpmn:StartEvent",
  //"bpmn:EndEvent"
  //"bpmn:IntermediateCatchEvent",
  //"bpmn:BoundaryEvent",
];
const HTML_FOR_EDITOR =   "<div class='content with-diagram' id='js-drop-zone'>"+
    "<div class='message intro'>"+
      "<div class='note'>"+
        "There is no BPMN-schema for this process. Drag and drop a schema from your desktop or <a id='js-create-diagram' href>create new one </a>."+
      "</div>"+
    "</div>"+
    "<div class='message error'>"+
      "<div class='note'>"+
        "<p>Ooops, we could not display the BPMN 2.0 diagram.</p>"+
        "<div class='details'>"+
          "<span>Import Error Details</span>"+
          "<pre></pre>"+
        "</div>"+
      "</div>"+
    "</div>"+
    "<div class='canvas' id='js-canvas'></div>"+
    "<div class='properties-panel-parent' id='js-properties-panel'></div>"+
  "</div>";
//   "<ul class='buttons'>"+
//     "<li>"+
//       "download"+
//     "</li>"+
//     "<li>"+
//       "<a id='js-download-diagram' href title='download BPMN diagram'>"+
//         "BPMN diagram"+
//       "</a>"+
//     "</li>"+
//     "<li>"+
//       "<a id='js-download-svg' href title='download as SVG image'>"+
//         "SVG image"+
//       "</a>"+
//     "</li>"+
//   "</ul>";

var schemaFileName;
var canvas;
var overlays;
var commentedElements = [];
var comments;
var elementRegistry;
var bpmnViewer;

const supportedLanguages = [
    "ru-RU",
    "en-US"
]
const localizedDict={
    STR1:{
        "ru-RU": "Ctrl + колесо мыши - изменение масштаба схемы. Зажать и тащить - перемещение схемы",
        "en-US": "Ctrl + scrolling - change diagram scale. Drag and move - canvas navigation"
    },
    STR2:{
        "ru-RU": "Автоматически обновляемая таблица по ссылкам на элементах bpmn:",
        "en-US": "Automatically updated table by links inside bpmn-elements: "
    },
    UnsavedChanges:{
        "ru-RU": "Изменения не сохранены! Вы действительно хотите выйти?",
        "en-US": "Unsaved changes? Are you sure you want to quite? "
    },
    Roles: {
        "ru-RU": "Роли",
        "en-US": "Roles"
    },
    Artifacts: {
        "ru-RU": "Артефакты",
        "en-US": "Artifacts"
    },
    ProcessesAndOperations: {
        "ru-RU": "Процессы и операции",
        "en-US": "Processes and roles"
    },
    Events: {
        "ru-RU": "События",
        "en-US": "Events"
    },
    Others: {
        "ru-RU": "Другое",
        "en-US": "Others"
    },
    ErrorWhileSavingLinksTable: {
        "ru-RU": "Произошла ошибка при автоматическом обновлении страницы. Таблица со ссылками из диаграммы не будет обновлена. Обратитесь в техподдержку. ",
        "en-US": "Error while updating page content. Links table will not be updated. Contact your support. "
    }
}
var LANG = getLang();

//window.schemaUrl - global var initialized in findAttachAndRunApp(), used in bpmn-custom-modeler.development.js


$( document ).ready(function() {
    //var version = AJS.$('meta[name=ajs-version-number]').attr('content'); // 6.8.1 //22.08.2019 //or AJS.Meta.get("version-number") //"7.2.1" //10.03.20
    findAttachAndRunApp();
});

function getSourcePageId() {
    var thisSciptPath = $($( "script[src*='confluence-bpmn.js']")[0]).attr("src"); //like https://confluence/download/attachments/182180480/confluence-bpmn.js"
    return thisSciptPath.split("attachments/")[1].split("/")[0];
}
function getLang() {
     var confluenceUI_lang = navigator.language || navigator.userLanguage;
     if (supportedLanguages.indexOf(confluenceUI_lang) > -1) {
         return confluenceUI_lang;
     } else {
         if (confluenceUI_lang.indexOf("en")>-1) {
             return "en-US";
         }
         return "ru-RU";
     }

}

function findAttachAndRunApp() {
    $.get( ATTACHEMENTS_LINKS, function( data ) {
        var $data =	$(data);
        var attachements = $data[0].results; //in order of descending ID (?)
        for (var i =0; i< attachements.length; i++) {
            var attachement = attachements[i];
            if (attachement.title.toLowerCase().indexOf(".bpmn")>0) {
                window.schemaUrl = attachement._links.download.split('?')[0];
                schemaFileName = attachement.title;
                runViewer();
                return;
            }
        }
        //if nothing found:
        runEditor();
    });
}

function runEditor() {
    try {
        $('#canvas').remove();
    } catch (e) {};
    bpmnViewer = null;
    
    $('#bpmn_zone').append($(HTML_FOR_EDITOR));    

    loadScriptsAndStylesForEditor();

    window.onbeforeunload = function() {
        if (hasUnsavedChanges()) {
            return localizedDict.UnsavedChanges[LANG];
        } else {
            return;
        }
    };
}

function hasUnsavedChanges() {
    if (bpmnModeler) {
        var xml = getXMLfromModeler();
        if (xml) {
            var currentHash = xml.myHashCode();
            if (currentHash == initialHash) { //initialHash in bpmn-custom-modeler.development.js
                return false;
            } else return true
        } else return false
    } else return false
}

//replacement of String.hashCode()
//https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/ 
//seems to be a lot faster than String.hashCode() due to hash << 5 - hash instead of hash * 31 + char
String.prototype.myHashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (var i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function getCurrentPageAttachementUrl() {
    return '/rest/api/content/'+PAGE_ID +'/child/attachment';
}

function runViewer() {
    loadScriptsAndStylesForViewer();
    prepareHtmlForViewer();
    drawSchema();
}


function loadScriptsAndStylesForEditor() {
    var $head=$('head');
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/app.css" type="text/css"/>'));
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/diagram-js.css" type="text/css"/>'));
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/diagram-js-minimap.css" type="text/css"/>'));
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/bpmn-embedded.css" type="text/css"/>'));
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/BPMN.css" type="text/css"/>')); //for viewer and editor

    //$head.append($('<script src="/download/attachments/'+SOURCE_PAGE_ID+'/bpmn-custom-modeler.development.js"></script>')); //for dev
    $head.append($('<script src="/download/attachments/'+SOURCE_PAGE_ID+'/bpmn-modeler.min.js"></script>')); //for prod

    //$("div.fullScreen_button").css("background-image", "/download/attachments/"+SOURCE_PAGE_ID+"/fullscreen.png");

}

function loadScriptsAndStylesForViewer() {
    var $head = $('head');
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/BPMN.css" type="text/css"/>')); ///for viewer and editor

    //$head.append($('<script src="/download/attachments/'+SOURCE_PAGE_ID+'/bpmn-navigated-viewer.development.js"></script>')); //for dev (has changes)
    $head.append($('<script src="/download/attachments/'+SOURCE_PAGE_ID+'/bpmn-viewer.min.js"></script>')); //for prod
    $head.append($('<script src="/download/attachments/'+SOURCE_PAGE_ID+'/jquery.balloon.min.js"></script>')); //for balloons
    $head.append($('<script src="/download/attachments/'+SOURCE_PAGE_ID+'/jquery-ui.min.js"></script>')); //for dialog. JQuery UI was included inside previous versions of Confluence 
    $head.append($('<link rel="stylesheet" href="/download/attachments/'+SOURCE_PAGE_ID+'/jquery-ui.css" type="text/css"/>')); ///for dialog. JQuery UI was included inside previus versions of Confluence //ui-darkness
     
}


function prepareHtmlForViewer() {
    $('#bpmn_zone').append($('<div id="canvas"></div>')); //for viewer    
    $('<div class="toolBarNote">'+localizedDict.STR1[LANG]+'</div>').insertBefore('#bpmn_zone'); //for viewer

    var $canvas=$('#canvas');
    $canvas.prepend($('<div id="fullScreenButton" class="bpmn_buttons fullScreen_button_view_mode" onclick="fullScreen()"></div>'));
    $canvas.append($('<div id="editButton" class="bpmn_buttons edit_button" onclick="runEditor()">Edit diagram</div>')); //for viewer
    $canvas.append($("<div id='CreateComment' style='display:none'><div id='CommentedElementTitle-2' class='ui-dialog-title'></div><textarea name='comment' id='NewCommentInput'></textarea></div>"));

    //$("div.fullScreen_button_view_mode").css("background-image", "/download/attachments/"+SOURCE_PAGE_ID+"/fullscreen.png");
}

function drawSchema(){  //only viewer        
    // viewer instance
      bpmnViewer = new BpmnJS({ 
        container: '#canvas',
        //zoomScroll: { disabled: true } or bpmnViewer.get("zoomScroll").toggle(true|false) not necessary due to changes in bpmn-navigated-viewer.development.js -> ZoomScroll.prototype._handleWheel
      });
      function openDiagram(bpmnXML) {
            // import diagram
            bpmnViewer.importXML(bpmnXML, function(err) {
                  if (err) {
                    return console.error('could not import BPMN 2.0 diagram', err);
                  }
                  // access viewer components
                  canvas = bpmnViewer.get('canvas');
                  
                  canvas.zoom("fit-viewport");
                  canvas.zoom(1.0, {x: 50, y:50});

                  overlays = bpmnViewer.get('overlays');

                //   fitCanvas();   
                  comments = getComments();
                  if(comments) {
                    $.each(comments, function(index, comment) {
                        if (!comment.element_id) return true;
                        try {
                            overlays.add(comment.element_id, 'note', {
                                position: {
                                bottom: 5,
                                right: 5
                                },
                                html: "<div id = 'diagram-note-"+comment.commentTreadId+"' title = 'Scroll down to comment' class='diagram-note' comment-tread-id = '"+comment.commentTreadId+"' onclick='scrollDownToComment(this)'>▼</div>"
                            });

                            $("#diagram-note-"+comment.commentTreadId).balloon({
                                html: true, position: 'right',
                                css: {
                                    opacity: "1",
                                    border: "1px solid navy",
                                    backgroundColor: '#fdfdbe',
                                    color: "black"
                                },  
                                url: location.href +' #'+comment.commentTreadId
                            });
                        } catch(e) {
                            console.log("Unable to create overlay for comment with element id: " + comment.element_id);
                        }
                    });
                  }
                  elementRegistry = bpmnViewer.get('elementRegistry');
                  $.each(elementRegistry._elements, function(index, el) {
                      prepareElement(el);
                  });
                  $("#helper-svg").remove(); //this is workaround with error "a.className.match is not a function" while trying to create page tag in confluence
                    //context:
                    //1. Camunda viewer create <svg id="helper-svg" width="0" height="0" style="visibility: hidden; position: fixed"></svg>
                    //2. Confluence iterate some elements with id. SVGSVGElement's method "className"" returns an object, not a string. This causes "a.className.match is not a function"
            });
      }
      $.get(window.schemaUrl, openDiagram, 'text');    
      $("#page-comments").on("click", function(event) {focusBPMNelementFromComment(event)}); 
}

function scrollDownToComment(clickedDiv) {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    };
    var thread_id = $(clickedDiv).attr("comment-tread-id");
    $([document.documentElement, document.body]).animate({
        scrollTop: $("#"+thread_id).offset().top
    }, 1000);

    $($("#"+thread_id).find("div.comment")[0]).addClass("focused");
}

function getComments() {
    var temp_comments = [];
    var commentsDivs = $("#page-comments").find("div.bpmn-js-confluence"); //old version $("div.bpmn-js-confluence"); but in some cases there is additional invisible div id=showCommentsInBody with dublicated comments.
    $.each(commentsDivs, function (index, commentDiv){
        //commentDiv.classList.forEach( //classList.forEach is not supported by IE and old FF
        var classList = $(commentDiv).attr("class").split(" ");
        $.each(classList, function(index, className) {
            try {
                if (className.toLowerCase().indexOf("comment-for-")>-1) {
                    var comment = {
                        element_id: className.split("-for-")[1],
                        text:  $($(commentDiv).closest(".comment-thread")[0]).html(),
                        commentTreadId: $(commentDiv).closest(".comment-thread")[0].id
                    }
                    temp_comments.push(comment);
                    commentedElements.push(comment.element_id); 
                }
            } catch(ex) {
                console.log("error while parsing div.page-comments:" + ex.message);
            }
        });            
        
    });
    return temp_comments;
}
function focusBPMNelementFromComment(event) {
    if (!event.type) return;
    if (event.type == "click") {
        var target = event.target;
        if (target.classList.contains("bpmn-js-confluence-comment-back-link")) { //todo: IE and FF
            target.parentElement.parentElement.parentElement.parentElement.classList.remove("focused");
            var elementId = target.parentElement.classList[1].split("comment-for-")[1];
            //center element:
            $([document.documentElement, document.body]).animate({
                scrollTop: $("#canvas").offset().top
            }, 1000);

            var bbox = elementRegistry.get(elementId);
            var currentViewbox = canvas.viewbox();
            var elementMid = {
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2
            };

            canvas.viewbox({
                x: elementMid.x - currentViewbox.width / 2,
                y: elementMid.y - currentViewbox.height / 2,
                width: currentViewbox.width,
                height: currentViewbox.height
            });

            var focusedGraphicsElement = elementRegistry.getGraphics(elementId);
            var djs_element = $(focusedGraphicsElement).find(".djs-visual")[0];
            var g_element = $(djs_element).children()[0];
            $(g_element).css("stroke", "red");
        }
    }
    
}


function saveSchema() { //handler is in modeler.js
    //$("#editButton").html("<img src='/download/attachments/"+SOURCE_PAGE_ID+"/loadspinner.gif' width='32' height='32'>");
    updateHostingPageByLinks();
    bpmnModeler.saveXML({
        format: true
    }, function (err, xml) {
        if (!schemaFileName){ 
            schemaFileName = DEFAULT_FILENAME 
        };
        updateBPMNAttachment(PAGE_ID, schemaFileName, xml);
    });
}

function updateHostingPageByLinks() {
    try {
        var linksObjectsArray = parseBPMNLinks();
        var newLinksHTMLTable = renderLinksAsATable(linksObjectsArray);
        
        //sync(!):
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('GET', '/rest/api/content/'+PAGE_ID+'?expand=body.editor,version', false); 
        xmlhttp.send();
        if(xmlhttp.status == 200) {
            var returnData = JSON.parse(xmlhttp.responseText);
            var updatedData ={
                        "version": {
                            "number": returnData.version.number + 1
                        },
                        "title": returnData.title,
                        "type": "page",
                        "body": {
                            "storage": {
                                "value": modifyPageHtmlByLinks(returnData.body.editor.value, newLinksHTMLTable), //returnData.body.editor.value + newLinksHTMLTable, //
                                "representation": "editor" //если запрос был на body.editor, то и здесь editor
                            }
                        }
                    };
            var xhr = new XMLHttpRequest();
            xhr.open('PUT', '/rest/api/content/'+PAGE_ID, false); 
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8'); //TODO: try to change to application/bpmn or text
            xhr.send(JSON.stringify(updatedData));
            if(xhr.status == 200) {
                console.log("Updating page successful. "+ xhr.responseText);
            } else {
                console.log("Web-service returns an error while updating confluence page "+PAGE_ID);
                console.log("Status: "+ xhr.status);
                console.log("Response text: " + xhr.responseText);
                alert(localizedDict.ErrorWhileSavingLinksTable[LANG] + " PUT CONTENT");
            }
        } else {
            console.log("Web-service returns an error while getting confluence page content. "+PAGE_ID);
            console.log("Status: "+ xmlhttp.status);
            console.log("Response text: " + xmlhttp.responseText);
            alert(localizedDict.ErrorWhileSavingLinksTable[LANG] + " GET CONTENT");
        }
    } catch(e) {
        alert(localizedDict.ErrorWhileSavingLinksTable[LANG] +" " +e.message);
    }

    function modifyPageHtmlByLinks(initialHtml, htmlTable) {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(initialHtml, 'text/html');
        var $html = $(htmlDoc);
        //var $htmlAsXML = $(htmlAsXML);
        //unsupported macro: data-macro-name="view-file" 
        var viewFileMacro = $html.find("img[data-macro-name='view-file']");
        if (viewFileMacro.length > 0) {
                //TODO
        } else {

        }
        var table = $html.find("div.bpmn-links-table");
        if (table.length > 0) {
            $(table[0]).html(htmlTable);
        } else {
            var bpmn_zone_macro = $html.find("*[data-macro-name='html']"); 
            $(bpmn_zone_macro[0]).after("<div class = 'bpmn-links-table'>"+htmlTable+"</div>"); //insert after first html macro. 
            //It's unable to use the attribute of id, I think, due to internal confluence parser
        }
        return $html[0].body.innerHTML;
    }

    function parseBPMNLinks() {
        var links = []; 
        elementRegistry = bpmnModeler.get("elementRegistry");
        $.each(elementRegistry._elements, function(index, elem) {
            //if (jQuery._data( elem.gfx, 'events' )) return; //why?
            if (elem.element.type == "label") return true; //due to labels inherits properties from the parent. For excluding double-links
            try {
                var businessObject = elem.element.businessObject;
                var extensionElements = businessObject.extensionElements;
                if (!extensionElements) { 
                    try {
                        extensionElements = businessObject.processRef.extensionElements; //for bpmn:participant
                    }
                    catch(e) {}
                }
                var a = extensionElements.values[0]; //elementRegistry structure depends on source object (viewer or modeler)
                var properties = a.values;
                for (var i =0; i<properties.length; i++) {
                    if (properties[i].name.toLowerCase() == BPMN_PROPERTIES.url.toLowerCase()) {
                        var linkType = "";
                        switch (businessObject.$type) {
                            case "bpmn:Process": linkType = "processesAndTasks"; break
                            case "bpmn:Collaboration": linkType = "processesAndTasks"; break
                            case "bpmn:Participant": linkType = "roles"; break
                            case "bpmn:Lane": linkType = "roles"; break
                            case "bpmn:DataOutputAssociation": linkType = "others"; break
                            case "bpmn:DataInputAssociation": linkType = "others"; break
                            case "bpmn:SequenceFlow": linkType = "others"; break
                            case "bpmn:MessageFlow": linkType = "others"; break
                            case "bpmn:Association": linkType = "others"; break
                            case "bpmn:Task": linkType = "processesAndTasks"; break
                            case "bpmn:ServiceTask": linkType = "processesAndTasks"; break
                            case "bpmn:SubProcess": linkType = "processesAndTasks"; break
                            case "bpmn:DataObjectReference": linkType = "artifacts"; break
                            case "bpmn:DataStoreReference": linkType = "artifacts"; break
                            case "bpmn:ExclusiveGateway": linkType = "others"; break
                            case "bpmn:EventBasedGateway": linkType = "others"; break
                            case "bpmn:ParallelGateway": linkType = "others"; break
                            case "bpmn:TextAnnotation": linkType = "others"; break
                            case "bpmn:StartEvent": linkType = "events"; break
                            case "bpmn:EndEvent": linkType = "events"; break
                            case "bpmn:IntermediateCatchEvent": linkType = "events"; break
                            case "bpmn:IntermediateThrowEvent": linkType = "events"; break
                            case "bpmn:BoundaryEvent": linkType = "events"; break
                            default:
                                linkType = "others";
                            break
                        };
                        //*************TEMP FOR DOMAIN CHANGES*******************//Delete ASAP
                        var newUrl = properties[i].value.replace("twiki.dellin.ru", "twiki.bia-tech.ru");
                        //*************TEMP FOR DOMAIN CHANGES*******************//Delete ASAP
                        links.push({
                            elementType: businessObject.$type,
                            elementId: businessObject.id,
                            elementName: elem.element.businessObject.name,
                            type: linkType,
                            url: newUrl //properties[i].value,
                        });
                        
                    }
                }
            }
            catch (e) {
                //console.log(e.message);
            }
        });
        return links;
    }
    function renderLinksAsATable(links) {
        

        var tdForRoles = "<td>";
        var tdForArtifacts = "<td>";
        var tdForProcessesAndTasks = "<td>";
        var tdForEvents = "<td>";
        var tdForOthers = "<td>";
        
        $.each(links, function(index, link) {
            switch (link.type) {
                case "roles": 
                    tdForRoles += createHtmlForSingleLink(link); 
                break
                case "artifacts": 
                    tdForArtifacts += createHtmlForSingleLink(link); 
                break
                case "events": 
                    tdForEvents += createHtmlForSingleLink(link); 
                break
                case "processesAndTasks": 
                    tdForProcessesAndTasks += createHtmlForSingleLink(link); 
                break
                case "others": 
                    tdForOthers += createHtmlForSingleLink(link);
                break
            }
        })
        
        tdForRoles += "</td>";
        tdForArtifacts += "</td>";
        tdForProcessesAndTasks += "</td>";
        tdForEvents += "</td>";
        tdForOthers += "</td>";

        var html = '<p><div class="toolBarNote">'+localizedDict.STR2[LANG]+'</div>'+
        '<table class="wrapped relative-table confluenceTable">'+
        '<colgroup>'+
            '<col style="width: 0.0px">'+
            '<col style="width: 0.0px">'+
            '<col style="width: 0.0px">'+
            '<col style="width: 0.0px">'+
            '<col style="width: 0.0px">'+
        '</colgroup>'+
        '<tbody>'+
        '<tr>'+
            '<th class="confluenceTh">'+localizedDict.Roles[LANG]+'</th>'+
            '<th class="confluenceTh">'+localizedDict.Artifacts[LANG]+'</th>'+
            '<th class="confluenceTh">'+localizedDict.ProcessesAndOperations[LANG]+'</th>'+
            '<th class="confluenceTh">'+localizedDict.Events[LANG]+'</th>'+
            '<th class="confluenceTh">'+localizedDict.Others[LANG]+'</th>'+
        '</tr><tr>'; //need to close </tr></tbody></table></p>; 

        html+= tdForRoles + tdForArtifacts + tdForProcessesAndTasks + tdForEvents +tdForOthers + "</tr></tbody></table></p>";
        return html;

        function createHtmlForSingleLink(linkObject) {
            if ((linkObject.url.toLowerCase().indexOf(window.location.origin)>-1)||(linkObject.url.charAt(0)=="/")) {
                //link to a confluence page:
                //assuming url has a format like this: https://portal/pages/viewpage.action?pageId=182170739
                //but if page title has only eng-chars Confluence formats links like this: https://portal/display/space-name/page-name
                try {
                    var pageId = linkObject.url.split("viewpage.action?pageId=")[1]; //processing format like https://portal/pages/viewpage.action?pageId=182170739
                    var serviceUrl = "";
                    if (pageId) {
                        serviceUrl = '/rest/api/content/'+pageId+'?expand=version,space';
                    } else {
                        var tempString = linkObject.url.split("display/")[1]; //processing format like https://portal/display/space-name/page-name
                        serviceUrl = '/rest/api/content/?spaceKey='+tempString.split("/")[0]+'&title='+tempString.split("/")[1]+'&expand=version,space';
                    }
                    serviceUrl = serviceUrl.split("&src=")[0];
                    //sync(!):
                    var xmlhttp = new XMLHttpRequest();
                    xmlhttp.open('GET', serviceUrl, false); 
                    xmlhttp.send();
                    if(xmlhttp.status == 200) {
                        var pageData;
                        if (serviceUrl.indexOf("?spaceKey=")>0) {
                            pageData = JSON.parse(xmlhttp.responseText);
                            pageData = pageData.results[0]
                        } else {
                            pageData = JSON.parse(xmlhttp.responseText);
                        }
                        var returnHtml = '<p>' +
                                        '<a data-base-url="'+window.location.origin+'"'+ 
                                        //' title="'+pageData.space.name +": "+ pageData.title +'"'+//doesn't work
                                        ' data-linked-resource-id="'+pageData.id +'"'+
                                        ' data-linked-resource-type="page"'+
                                        ' href="/pages/viewpage.action?pageId='+pageData.id +'"'+
                                        ' data-linked-resource-default-alias="'+pageData.title+'"'+
                                        ' class="confluence-link"'+
                                        ' data-linked-resource-version="'+pageData.version.number+'">'+
                                        pageData.space.key +": "+ pageData.title+'</a>'+
                                        '</p>'; 
                                        //be careful with modifying this format. It must meet internal confluence criterias.
                                        //if something wrong happens the content service will throw an error "Validation failure when converting format"
                        return returnHtml;
                    } else {
                        console.log("Web-service returns an error!");
                        console.log("Status: "+ xmlhttp.status);
                        console.log("Response text: " + xmlhttp.responseText);
                        return "<p><a href='"+linkObject.url+"'> (service error) "+linkObject.url +"</a></p>";
                    }
                } catch(e) {
                    return "<p><a href='"+linkObject.url+"'> (render exception) "+linkObject.url +"</a></p>";
                }
                
            }
            //only for portal DL:
            // if  (linkObject.url.toLowerCase().indexOf("/documents/show")) {
            //     try {
            //         //var newPortalLink = "https://portal.dellin.ru/documents/show" + linkObject.url.toLowerCase().split("/documents/show")[1]; //change url for excluding mixed content blocking
            //         var newPortalLink = linkObject.url.toLowerCase();
            //         //sync(!):
            //         var xmlhttp = new XMLHttpRequest();
            //         xmlhttp.open('GET', newPortalLink, false); 
            //         //header?
            //         xmlhttp.send();
            //         if(xmlhttp.status == 200) {
                        
            //             var parser = new DOMParser();
            //             var doc = parser.parseFromString(xmlhttp.responseText, "text/html");
                        
            //             docName = $(doc).find("p.docname");
            //             docStatus = $(doc).find("p.docstatus");
                        
            //             var docNameText = "";
            //             for (var i=0;i<docName.length; i++) {
            //                 docNameText += " . "+ docName[i].innerText.replace(/&lt;br&gt;/g," ");;
            //             }
                        
            //             var docStatusText = "";
            //             for (var i=0;i<docStatus.length; i++) {
            //                 docStatusText += " . " + docStatus[i].innerText.replace(/&lt;br&gt;/g," ");;
            //             }
            //             var returnHtml = '<p>' +
            //                 '<a href="'+newPortalLink+'" '+ 
            //                 'title="'+docStatusText + '">'+
            //                 'КИП: '+docNameText +
            //                 '</a>'+
            //                 '</p>';
            //             return returnHtml;
            //         } else {
                        
            //         }

            //     } catch(e) {

            //     }
            // }
            
            //default return:
            return "<p><a href='"+linkObject.url+"'>"+linkObject.url +"</a></p>";
        }
    }
}


function getXMLfromModeler() {
    var returnString;
    if (bpmnModeler) {
        bpmnModeler.saveXML({format: true }, function(err, xml) {
                returnString = xml;
        });
    } else {
        returnString = null;
    }
    return returnString;
}


function prepareElement(elem) {
    //elem - event object
    //elem.element = model element
    //elem.gfx = graphical element

    // var overlays = bpmnViewer.get('overlays');
    
    if (jQuery._data( elem.gfx, 'events' )) return; //why?
    try {
        var businessObject = elem.element.businessObject;
        var isMuted = (MUTED_TYPES.indexOf(businessObject.$type) >-1) || (commentedElements.indexOf(businessObject.id)>-1); //isElementMuted(businessObject.id, businessObject.$type);
        var objectIdOrFalse = businessObject.id;
        if (isMuted) objectIdOrFalse = false;
        var objectNameForCommenting = getObjectNameForCommenting(businessObject);// regExpForTitle.exec(businessObject.name); //

        if (objectIdOrFalse) {            
            overlays.add(objectIdOrFalse, 'note', {
              position: {
                bottom: 10,
                right: 5
              },
              html: "<div title = 'Comment this...' class='diagram-add-comment' onclick='openCommentDialog(\""+ objectIdOrFalse+"\", \"" +objectNameForCommenting +"\",\""+businessObject.$type+"\")'>+</div>"
            });
        }

          //iterate properties to find ones extending BPMN 2.0 (see global vars at the top)
          var extensionElements = businessObject.extensionElements;
          if (!extensionElements) {
            try {
                extensionElements = businessObject.processRef.extensionElements; //for bpmn:participant
            }
            catch(e) {}
          }
          var a = extensionElements.values[0];
          var properties = a.$children;
          
          for (var i =0; i<properties.length; i++) {
            if (properties[i].name == BPMN_PROPERTIES.url) 
              changeGElement(elem.gfx,businessObject.$type, properties[i].value, '_blank', elem.element.businessObject.name, objectIdOrFalse);
            // if (properties[i].name == bpmnProperties.processId) 
            //   changeGElement(elem.gfx, appUrl +'?IDdoc='+properties[i].value, '_self', elem.element.businessObject.name, objectIdOrFalse);
          }
    }
    catch (e) {
        //console.error(e.message);
    }
}

function getObjectNameForCommenting(object) {
    var returnString;
    try {
        returnString = object.name.replace(/[^A-Z0-9А-Я]+/gmi, " ");
    } catch (e) {
        return object.id;
    }
    if (returnString) { return returnString }
    else {
        return object.id;
    }
}

function openCommentDialog(element_id, elementTitle, type) {
   $("#CommentedElementTitle-2").html(elementTitle +" ( "+type+" ) ");
   $( "#CreateComment" ).dialog({
      appendTo: "#canvas",
    //   autoOpen: false,
      open: function(){
                      $('.ui-widget-overlay').css({"background":"black","opacity": "0.5"});
                      $("div.ui-dialog").appendTo("#canvas"); //appendTo seems to not working...
                  },
      title: "Создать обсуждение элемента", //"Create elements discussion",//,
      closeOnEscape: true,
      modal:true,
      maxWidth: 850,
      minWidth: 620,
      maxHeight: 600,
      minHeight: 400,
      buttons: [
        //   {
        //       text: "Show solved questions",//"Показать решенные вопросы",
        //       click: function() {
        //           alert("Under construction");
        //       }
        //   },
          {
              text: "Создать", //"Ok", //"Создать",
              click: function() {
                  createDiscussion(element_id, elementTitle, document.getElementById("NewCommentInput").value);
                  $( this ).dialog( "close" );
                  alert("Новый комментарий появится через некоторое время внизу страницы");
                  //window.open(window.location.href, "_self");
              }
          },
          {
              text: "Закрыть", //"Cancel"
              click: function() {
                  $( this ).dialog( "close" );
              }
          }
      ]
  });
  $( "#CreateComment" ).dialog( "open" );
}

function createDiscussion(element_id, element_title, text) {
    
    jQuery.ajax({
        url: "/rest/api/content/" + PAGE_ID,
        success: function(parentPage) {
            var pageData = {};
            pageData.type = 'comment';
            pageData.container = parentPage;
            pageData.body = {};
            pageData.body.storage = {};
            //unfortunately, Confluence's parser cuts html attrs id and onclick. So events handlers are created outside
            pageData.body.storage.value = "<div class = 'bpmn-js-confluence comment-for-"+element_id+"'>Комментарий к элементу схемы <a class = 'bpmn-js-confluence-comment-back-link' href = ''>"+element_title+"</a></div><br/>" + text;
            pageData.body.storage.representation = 'storage';
            jQuery.ajax({
                contentType: 'application/json',
                type: 'POST',
                url: "/rest/api/content",
                data: JSON.stringify(pageData),
            });
        } //todo: create layout
    });
}


function changeGElement(element, elementType, url, blankOrSelf, name, objectIdOrFalse){
    var elementId = $(element).attr('data-element-id');
    if(!(elementId.indexOf('_label')>0)) { // check  whether elementId.indexOf('_label')> -1?
        switch (elementType.toLowerCase()) {
            case "bpmn:lane":
                setLinkForLaneAndParticipant(element, elementId, url );
            break
            case "bpmn:participant":
                setLinkForLaneAndParticipant(element, elementId, url );
            break
            default:
                element.addEventListener('click', function(e) {
                    window.open(url, blankOrSelf)
                });
                element.title = 'Go by link';
                element.style.cursor = 'pointer';
                var djs_element = $(element).find(".djs-visual")[0];
                var g_element = $(djs_element).children()[0];
                $(g_element).css("stroke", "rgb(30, 136, 229)").css("fill", "rgb(187, 222, 251)").css("fill-opacity","0.95");
                showBaloonFromLink(djs_element, url);
            break
        }
    }
    function setLinkForLaneAndParticipant(element, elementId, url ) {
        var laneTitle = $(element).find("text")[0];
        // laneTitle.addEventListener('click', function(e) {
        //     window.open(url, blankOrSelf)
        // });
        overlays.add(objectIdOrFalse, 'note', {
            position: {
                bottom: 25,
                left: 2
            },
            html: "<div id='url_for_"+elementId+"' title = '"+url+"' onclick='window.open(\""+url+"\", \"_blank\")' class='diagram-link'>▲</div>"
        });
        $(laneTitle).css("fill", "rgb(30, 136, 229)"); //SVG text
        showBaloonFromLink($("#url_for_"+elementId), url);
    }
    function showBaloonFromLink($element_id, url) {
        //todo: refactor this
        var filterUrlContext = "";
        var mixedContentOrCORS = true;

        if (url.indexOf(window.location.host)>-1 ) {
            filterUrlContext = " #title-text"; //title-text - is a h1 id for confluence page title
        }

        if (url.indexOf(window.location.origin)>-1) { //"https://hostname"
            mixedContentOrCORS = false;
        }

        if (url.charAt(0)== "/") {
            mixedContentOrCORS = false;
            filterUrlContext = " #title-text";
        }

        if (mixedContentOrCORS) {
            $($element_id).balloon({
                html: true, position: 'top',
                contents: '<div>'+url+'</div>',
                url: url
            });
            return;
        }
        
        if (filterUrlContext) {
            $($element_id).balloon({
                html: true, position: 'top',
                contents: '<img src="/download/attachments/'+SOURCE_PAGE_ID+'/loadspinner.gif" alt="loading..." width="32" height="32">', //'<div>'+url+'</div>' //
                css: {
                     "background-color": "#f4f5f7",
                     "opacity": 1
                },
                url: url + filterUrlContext
            });
        } 
        // else {
        //     $($element_id).balloon({
        //         html: true, position: 'top',
        //         contents: '<img src="/download/attachments/'+SOURCE_PAGE_ID+'/loadspinner.gif" alt="loading..." width="32" height="32">', //'<div>'+url+'</div>' //
        //         css: {
        //              maxHeight: "200px",
        //              maxWidth: "800px",
        //              opacity: "1"
        //         },
        //         url: url
        //     });
        // }

    }
    
}

//this is deprecated method, but it works
//other ways don't provide results (yet). See test_AP() and:
//https://docs.atlassian.com/atlassian-confluence/REST/6.5.2/?_ga=2.40032166.545997850.1565465716-1694065856.1565465716#content/{id}/child/attachment-updateData  
//https://community.developer.atlassian.com/t/upload-attachment/8014 

function updateBPMNAttachment(pageId, fileName, xml) {
    
    //*************TEMP FOR DOMAIN CHANGES*******************//Delete ASAP
    //xml.replace("https://twiki.dellin.ru", "https://twiki.bia-tech.ru");
    xml = xml.split("https://twiki.dellin.ru").join("https://twiki.bia-tech.ru");
    //*************TEMP FOR DOMAIN CHANGES*******************//Delete ASAP
    var payload = window.btoa(unescape(encodeURIComponent(xml)))
    var attachment = { 
        fileName : fileName, 
        contentType : 'application/json'
    };
    var params = [
        pageId,
        attachment,
        payload
    ];
    jQuery.ajax({
            url: '/rpc/json-rpc/confluenceservice-v2/addAttachment',
            type: 'POST',
            data: JSON.stringify(params),
            contentType : 'application/json;charset=UTF-8',
            success: function() {
                window.onbeforeunload = true; //to prevent hashes comparison
                location.reload() //to extit edit-mode and show diagram in viewer
            }
        });
}


//Not working:
function test_AP() {
    var formdata = new FormData();
    var debug = {hello: 'world'};
    var blob = new Blob([JSON.stringify(debug, null, 2)], { type: 'text/xml'});
    //formdata.append(document.getElementById('modelname').value, xml);
    AP.request({
        url: 'https://twiki.dellin.ru/rest/api/content/182170739/child/attachment/att182170793/data',
        type: 'POST',
        contentType: 'multipart/form-data',
        data: {comment: 'Edited', minorEdit: false, file: formdata}, //file:blob
        success: function(responseText){
            console.info(responseText);
        },
        error: function(xhr, statusText, errorThrownText) {
            console.error('Wrongsie!'+statusText);
        }
    });
}

function fullScreen(){
    var e,t=document.querySelector("#bpmn_zone");
    e=t,document.fullscreenElement||document.mozFullScreenElement||document.webkitFullscreenElement||document.msFullscreenElement?document.exitFullscreen?document.exitFullscreen():document.msExitFullscreen?document.msExitFullscreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.webkitExitFullscreen&&document.webkitExitFullscreen():e.requestFullscreen?e.requestFullscreen():e.msRequestFullscreen?e.msRequestFullscreen():e.mozRequestFullScreen?e.mozRequestFullScreen():document.documentElement.webkitRequestFullscreen&&e.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
}



