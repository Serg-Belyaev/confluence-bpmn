
var pageId = '';
var schemaUrl = '';
//var comments = [];
var bpmnViewer;
var attachementsLink = ''; //
var sourcesPageId = ""; //'182180480';
var schemaFileName ="";
var canvas = "";
var overlays = "";
var commentedElements = "";
var comments="";
var elementRegistry = "";
var defaultFileName = "diagram.bpmn";
var lang="";

//vars for properties extending BPMN 2.0:
var bpmnProperties = {
    url: 'url', //name of the property in bpmn-xml for url.
    processId: 'process_id' //name of the property in bpmn-xml for process_id. Process_id is using to link to another process from the processListName list
}

var mutedTypes = [ //array of bpmn-element types. Comment lines below to prohibit users to comment the special bpmn-elements
//comment and uncomment lines below as you wish
  "bpmn:Process",
  "bpmn:Collaboration",
  "bpmn:Participant",
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


$( document ).ready(function() {
    //var version = AJS.$('meta[name=ajs-version-number]').attr('content'); // 6.8.1 //22.08.2019 //or AJS.Meta.get("version-number")
    //prepareHtmlAndScripts();
    attachementsLink = getCurrentPageAttachementUrl();
    sourcesPageId = getSourcePageId();
    lang = navigator.language || navigator.userLanguage;
    findAttachAndRunApp();
});

function getSourcePageId() {
    var thisSciptPath = $($( "script[src*='confluence-bpmn.js']")[0]).attr("src"); //like https://confluence/download/attachments/182180480/confluence-bpmn.js"
    return thisSciptPath.split("attachments/")[1].split("/")[0];
}


function findAttachAndRunApp() {
    $.get( attachementsLink, function( data ) {
        var $data =	$(data);
        var attachements = $data[0].results; //in order of descending ID (?)
        for (var i=0;i<attachements.length;i++) {
            var attachement = attachements[i];
            // var labels = attachement.metadata.labels.results;
            // for (var j=0;j<labels.length;j++) {
            //     var label = labels[j];
            //     if (label.name.toLowerCase() ==labelName.toLowerCase() ) {
            //         schemaUrl = attachement._links.download.split('?')[0];
            //         schemaFileName = attachement.title;
            //         drawSchema();
            //         return;
            //     }
            // }
            if (attachement.title.toLowerCase().indexOf(".bpmn")>0) {
                schemaUrl = attachement._links.download.split('?')[0];
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
    
    $('head').append($('<link rel="stylesheet" href="/download/attachments/'+sourcesPageId+'/app.css" type="text/css"/>'));
    $('head').append($('<link rel="stylesheet" href="/download/attachments/'+sourcesPageId+'/diagram-js.css" type="text/css"/>'));
    $('head').append($('<link rel="stylesheet" href="/download/attachments/'+sourcesPageId+'/diagram-js-minimap.css" type="text/css"/>'));
    $('head').append($('<link rel="stylesheet" href="/download/attachments/'+sourcesPageId+'/bpmn-embedded.css" type="text/css"/>'));
    $('head').append($('<link rel="stylesheet" href="/download/attachments/'+sourcesPageId+'/BPMN.css" type="text/css"/>')); //for viewer and editor

    $('#bpmn_zone').append($(htmlForEditor)); 

    $('head').append($('<script src="/download/attachments/'+sourcesPageId+'/bpmn-custom-modeler.development.js"></script>'));
}

function getCurrentPageAttachementUrl() {
    pageId = AJS.params.pageId;
    return '/rest/api/content/'+pageId +'/child/attachment';
}

function runViewer() {
    loadScriptsForViewer();
    prepareHtmlForViewer();
    drawSchema();
}

function loadScriptsForViewer() {
    $('head').append($('<link rel="stylesheet" href="/download/attachments/'+sourcesPageId+'/BPMN.css" type="text/css"/>')); //for bpmnViewer
    //$('head').append($('<script src="/download/attachments/'+sourcesPageId+'/bpmn-navigated-viewer.production.min.js"></script>')); //for viewer 
    $('head').append($('<script src="/download/attachments/'+sourcesPageId+'/bpmn-navigated-viewer.development.js"></script>')); //for viewer 
}

function prepareHtmlForViewer() {
    $('#bpmn_zone').append($('<div id="canvas"></div>')); //for viewer
    if (lang=="ru-RU") {
        $('<div class="toolBarNote"> Ctrl + колесо мыши - изменение масштаба схемы. Зажать и тащить - перемещение схемы</div>').insertBefore('#bpmn_zone'); //for viewer
    } else {
        $('<div class="toolBarNote"> Ctrl + scrolling - change diagram scale. Drag and move - canvas navigation</div>').insertBefore('#bpmn_zone'); //for viewer
    }
    $('#canvas').prepend($('<div id="fullScreenButton" class="bpmn_buttons fullScreen_button_view_mode" onclick="fullScreen()"></div>'));
    $('#canvas').append($('<div id="editButton" class="bpmn_buttons edit_button" onclick="runEditor()">Edit diagram</div>')); //for viewer

    $('#canvas').append($("<div id='CreateComment' style='display:none'><div id='CommentedElementTitle-2' class='ui-dialog-title'></div><textarea name='comment' id='NewCommentInput'></textarea></div>"));
}

function drawSchema(){  //only viewer        
    // viewer instance
      bpmnViewer = new BpmnJS({ 
        container: '#canvas',
        zoomScroll: { disabled: true }
      });
      function openDiagram(bpmnXML) {
            // import diagram
            bpmnViewer.importXML(bpmnXML, function(err) {
                  if (err) {
                    return console.error('could not import BPMN 2.0 diagram', err);
                  }
                  // access viewer components
                  canvas = bpmnViewer.get('canvas');
                  canvas.zoom(1.0, {x: 50, y:50});
                  overlays = bpmnViewer.get('overlays');

                //   fitCanvas();   
                  comments = getComments();
                  if(comments) {
                    $.each(comments, function(index, comment) {
                        if (comment.element_id == 'null') return true;
                            // var elementTitle = '';
                            // try {
                            //     var temp = $('g[data-element-id=''+comment.element_id+'']'); //TODO: сделать через elementRegistry.get('StartEvent_1'); будет быстрее?
                            //     var temp2= $(temp).find('text');
                            //     elementTitle = temp2[0].textContent;
                            // }
                            // catch(e) {}

                            //set overlays on schema  
                            try {
                                overlays.add(comment.element_id, 'note', {
                                    position: {
                                    bottom: 5,
                                    right: 5
                                    },
                                    html: "<div title = 'Scroll down to comment' class='diagram-note' comment-tread-id = '"+comment.commentTreadId+"' onclick='scrollDownToComment(this)'>▼</div>"
                                });
                            } catch(e) {
                                console.log("Unable to create overlay for comment with element id: " + comment.element_id);
                            }

                            //set hyperlinks on comments header:
                            $("#"+comment.commentTreadId).find("a.bpmn-js-confluence-comment-back-link").on("click", function(e) {centerElement(comment.element_id)});
                    });
                  }
                  elementRegistry = bpmnViewer.get('elementRegistry');
                  $.each(elementRegistry._elements, function(index, el) {
                      prepareElement(el);
                  });
            });
      }
      $.get(schemaUrl, openDiagram, 'text');    
}


function scrollDownToComment(clickedDiv) {
    var thread_id = $(clickedDiv).attr("comment-tread-id");
    $([document.documentElement, document.body]).animate({
        scrollTop: $("#"+thread_id).offset().top
    }, 1000);
}

function getComments() {
    commentedElements = "";
    var temp_comments = [];
    var commentsDivs = $("div.bpmn-js-confluence");
    $.each(commentsDivs, function (index, div){
        var classList = $(div).attr("class").split(" ");
        $.each(classList, function(index, className) {
            if (className.toLowerCase().indexOf("comment-for-")>-1) {
                var comment = {
                    element_id: className.split("-for-")[1],
                    text:  $($(div).closest(".comment-thread")[0]).html(),
                    commentTreadId: $(div).closest(".comment-thread")[0].id
                }
                temp_comments.push(comment);
                commentedElements+= comment.element_id +";";
            }
        });            
        
    });
    return temp_comments;
}


function centerElement(elementId) {
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
}


function saveSchema() {
    bpmnModeler.saveXML({
        format: true
    }, function (err, xml) {
        if (!schemaFileName){ schemaFileName = defaultFileName };
        updateBPMN(pageId, schemaFileName, xml);
    });
}


function isElementMuted(id, type) {
  //if (mutedTypes.includes(type)) return true; //it does not work in IE, so:
  for (i=0;i<mutedTypes.length;i++) {
      if (mutedTypes[i]== type) return true;
  }
  if (commentedElements.indexOf(id+";")>-1) return true;
}

function prepareElement(e) {
    //e - event object
    //e.element = the model element
    //e.gfx = the graphical element

    // var overlays = bpmnViewer.get('overlays');
    
    if (jQuery._data( e.gfx, 'events' )) return;
    try {
        var businessObject = e.element.businessObject;
        var isMuted = isElementMuted(businessObject.id, businessObject.$type);
        var objectIdOrFalse = businessObject.id;
        if (isMuted) objectIdOrFalse = false;
        var objectNameForCommenting = getObjectNameForCommenting(businessObject);

        if (objectIdOrFalse) {            
            overlays.add(objectIdOrFalse, 'note', {
              position: {
                bottom: 10,
                right: 5
              },
              html: "<div title = 'Comment this...' class='diagram-add-comment' onclick='openCommentDialog(\""+ objectIdOrFalse+"\", \"" +objectNameForCommenting +"\",\""+businessObject.$type+"\")'>+</div>"
            });
        }

          //iterate properties to find properties extending BPMN 2.0 (see global vars at the top)
          var extensionElements = businessObject.extensionElements;
          var a = extensionElements.values[0];
          var properties = a.$children;
          for (i =0; i<properties.length; i++) {
            if (properties[i].name == bpmnProperties.url) 
              changeGElement(e.gfx,businessObject.$type, properties[i].value, '_blank', e.element.businessObject.name, objectIdOrFalse);
            // if (properties[i].name == bpmnProperties.processId) 
            //   changeGElement(e.gfx, appUrl +'?IDdoc='+properties[i].value, '_self', e.element.businessObject.name, objectIdOrFalse);
          }
    }
    catch (e) {
        console.log(e.message);
    }
}

function getObjectNameForCommenting(object) {
    try {
        return object.name.replace(/\'/g, '').replace(/\r?\n/g, '').replace("\"","");
    } catch (e) {
        return object.id;
    }
}

function openCommentDialog(element_id, elementTitle, type) {
   $("#CommentedElementTitle-2").html(elementTitle +" ( "+type+" ) ");
   $( "#CreateComment" ).dialog({
      autoOpen: false,
      open: function(){
                      $('.ui-widget-overlay').css({"background":"black","opacity": "0.5"});
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
                  //TODO: сделать сразу новый commment без перезагрузки
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
        url: "/rest/api/content/" + pageId,
        success: function(parentPage) {
            var pageData = {};
            pageData.type = 'comment';
                    //pageData.id = 'Comment-for-Task_0tb2es4'; //не работает
            pageData.container = parentPage;
            pageData.body = {};
            pageData.body.storage = {};
            //Confluence's parser cuts html attrs id and onclick. So events handlers are created outside
            pageData.body.storage.value = "<div class = 'bpmn-js-confluence comment-for-"+element_id+"'>Комментарий к элементу схемы <a class = 'bpmn-js-confluence-comment-back-link' href = ''>"+element_title+"</a></div><br/>" + text;
            pageData.body.storage.representation = 'storage';
            jQuery.ajax({
                contentType: 'application/json',
                type: 'POST',
                url: "/rest/api/content",
                data: JSON.stringify(pageData),
            });
        }
    });
}


function changeGElement(element, elementType, url, blankOrSelf, name, objectIdOrFalse){
    var elementId = $(element).attr('data-element-id');
    if(!(elementId.indexOf('_label')>0)) {
        switch (elementType.toLowerCase()) {
            case "bpmn:lane":
                var laneTitle = $(element).find("text")[0];
                // laneTitle.addEventListener('click', function(e) {
                //     window.open(url, blankOrSelf)
                // });
                overlays.add(objectIdOrFalse, 'note', {
                    position: {
                        bottom: 25,
                        left: 2
                    },
                    html: "<div title = '"+url+"' onclick='window.open(\""+url+"\", \"_blank\")' class='diagram-link'>▲</div>"
                });
                $(laneTitle).css("fill", "rgb(30, 136, 229)"); //SVG text
            break
            default:
                element.addEventListener('click', function(e) {
                    window.open(url, blankOrSelf)
                });
                element.title = 'Go by link';
                // var log = 'Ссылка на схеме: '+name+' url:'+url;
                // console.log(log);
                element.style.cursor = 'pointer';
                var djs_element = $(element).find(".djs-visual")[0];
                var g_element = $(djs_element).children()[0];
                $(g_element).css("stroke", "rgb(30, 136, 229)").css("stroke-width", "2px").css("fill", "rgb(187, 222, 251)").css("fill-opacity","0.95");
            break

            //var newId = makeid(4);
            //element.id = newId
            //Populate Links tab:

        //     $('#LinksTreeTab').append('<div class ='LinkDiv' onmouseover='highlightLinkSVG(\''+$(element).attr('data-element-id')+'\')' onmouseout='offlightLinkSVG(\''+$(element).attr('data-element-id')+'\')'      'onclick='window.open(' + url +', \'_blank\')'>'+
        // +name+
        //     '</div>');

            // $('#SchemaLinks').append('<div class ='LinkDiv' onmouseover='highlightLinkSVG(\''+elementId+'\')' onmouseout='offlightLinkSVG(\''+elementId +'\')'  onclick='window.open(\'' + 
            // url +'\', \'_blank\')'>'+
            // name +
            // ' <span class='url'> ('+url.substring(0,50)+')</span>'+
            // '</div>');
        }
    }
    
}

//this is deprecated method, but it works
//other ways don't provide results (yet). See test_AP() and:
//https://docs.atlassian.com/atlassian-confluence/REST/6.5.2/?_ga=2.40032166.545997850.1565465716-1694065856.1565465716#content/{id}/child/attachment-updateData  
//https://community.developer.atlassian.com/t/upload-attachment/8014 

function updateBPMN(pageId, fileName, xml) {
    //var payload = window.btoa(xml);
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
            success: location.reload()
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

var htmlForEditor =   "<div class='content with-diagram' id='js-drop-zone'>"+
    "<div class='message intro'>"+
      "<div class='note'>"+
        "Перетащите сюда файл BPMN-схемы с вашего рабочего стола или <a id='js-create-diagram' href>создайте новую схему</a>."+
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

