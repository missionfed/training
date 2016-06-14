var Guid = function () {
    var self = this;

    self.newGuid = function () {
        return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

$(function () {
    'use strict';

    // Initialize the jQuery File Upload widget:
    $('#fileupload').fileupload({

        url: 'http://appdev1/document.api/api/documents',  //'http://localhost:50967/api/documents', 
        // In order for chunked uploads to work in Mozilla Firefox, 
        // the multipart option has to be set to false. This is due to 
        // the Gecko 2.0 browser engine - used by Firefox 4+ - adding blobs 
        // with an empty filename when building a multipart upload request 
        // using the FormData interface
        //multipart: false,
        autoUpload: true,
        maxChunkSize: 10000000, // Defaults to 10 MB 
        beforeSend: function (jqXHR, settings) {
            jqXHR.setRequestHeader('X-File-Size', settings.files[0].size);//settings.chunksNumber);
            jqXHR.setRequestHeader('X-Total-Chunks', 1);//settings.chunksNumber);

            if (settings.files[0].documentId)
                jqXHR.setRequestHeader('X-Document-Id', settings.files[0].documentId);

            //if settings.chunkSize contains a value this means we are sending a chunk to the server
            if (settings.chunkSize) {
                jqXHR.setRequestHeader('X-Chunked-File-Name', _getChunkedFileName(settings));
                jqXHR.setRequestHeader('X-Current-Chunk-Index', _getCurrentChunkIndex(settings));//settings.chunkIndex);
                jqXHR.setRequestHeader('X-Total-Chunks', _getTotalChunks(settings));//settings.chunksNumber);
                jqXHR.setRequestHeader('X-Is-Final-Part', _isFinalPart(settings));
            }
        },
        fail: function (e, data) {
            console.log(data);

            $.ajax({
                url: 'server/php/',
                dataType: 'json',
                data: {
                    file: data.files[0].name
                },
                type: 'DELETE'
            })
        },
    })
    // Callback for successful chunk uploads:
    // chunkdone: function (e, data) {}, // .bind('fileuploadchunkdone', func);
    .bind('fileuploadchunkdone', function (e, data) {
        //server will return the documentid once it finished uploading the chunk
        data.files[0].documentId = data.result[0].documentId;
    })

    //// Callback for successful uploads:
    //// done: function (e, data) {}, // .bind('fileuploaddone', func);
    .bind('fileuploaddone', function (e, data) {
        //TODO: Get document id from the request and send ana ajax call to ITGOV api to persist the docid via. 
        //You access the document id via data.result[0].documentId;
        console.log({
            msg: 'fileupload.fileuploaddone',
            e: e,
            data: data,
        });
    })

    // Callback for drop events of the dropZone(s):
    .bind('fileuploaddrop', function (e, data) {
        //console.log({
        //    msg: 'fileupload.fileuploadsend',
        //    e: e,
        //    data: data,
        //});
    });

    // Enable iframe cross-domain access via redirect option:
    $('#fileupload').fileupload(
        'option',
        'redirect',
        window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        )
    );

    // Load existing files:
    $('#fileupload').addClass('fileupload-processing');
    $.ajax({
        // Uncomment the following to send cross-domain cookies:
        //xhrFields: {withCredentials: true},
        url: $('#fileupload').fileupload('option', 'url'),
        dataType: 'json',
        context: $('#fileupload')[0]
    }).always(function (result) {
        $(this).removeClass('fileupload-processing');
    }).done(function (result) {
        $(this).fileupload('option', 'done')
            .call(this, null, { result: result });
    });

    var _getCurrentChunkIndex = function (settings) {
        var startBytes = parseInt(settings.contentRange.substring(settings.contentRange.indexOf(' ') + 1, settings.contentRange.indexOf('-')));
        var endBytes = parseInt(settings.contentRange.substring(settings.contentRange.indexOf('-') + 1, settings.contentRange.indexOf('/')));
        if (endBytes + 1 == settings.total)
            return startBytes / settings.maxChunkSize;
        return startBytes / settings.chunkSize;
    }

    var _isFinalPart = function (settings) {
        var startBytes = parseInt(settings.contentRange.substring(settings.contentRange.indexOf(' ') + 1, settings.contentRange.indexOf('-')));
        var endBytes = parseInt(settings.contentRange.substring(settings.contentRange.indexOf('-') + 1, settings.contentRange.indexOf('/')));
        if (endBytes + 1 == settings.total)
            return true
        return false;
    }

    var _getTotalChunks = function (data) {
        var file = data.files[0];
        return Math.ceil(file.size / data.chunkSize);
    }

    var _generateUniqueFileName = function (data) {
        var file = data.files[0];
        var fileName = file.relativePath || file.webkitRelativePath || file.fileName || file.name;
        //result.replace(/[^0-9a-zA-Z_-]/img, "") + "-" + file.size + "_" + _getCurrentChunkIndex(data);
        var uniqueFileName = fileName + '.' + new Guid().newGuid();
        return uniqueFileName;
    }

    var _getChunkedFileName = function (data) {
        var file = data.files[0];
        var fileName = file.relativePath || file.webkitRelativePath || file.fileName || file.name;
        var uniqueFileName = fileName + "." + _getCurrentChunkIndex(data).toString();
        return uniqueFileName;
    }

});
