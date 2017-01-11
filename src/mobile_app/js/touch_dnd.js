/* global jQuery */
// DnD for touch devices
// =============================================================================
(function($) {
    var $doc = $(document), dragProxy, canDrop = null;

    function stopTouchDnD()
    {
        if (dragProxy) {
            dragProxy.remove();
            dragProxy = null;
        }

        canDrop = null;
        $doc.off(".dnd");
    }

    function startTouchDnD(e)
    {
        var orig = $(e.target).closest("[draggable]"),
            dropTarget,
            x = e.originalEvent.touches[0].pageX,
            y = e.originalEvent.touches[0].pageY;

        function createProxy()
        {
            var ofst = orig.offset(),
                w    = orig.outerWidth(),
                h    = orig.outerHeight();

            dragProxy = $('<div/>').css({
                position   : "fixed",
                top        : 0,
                left       : 0,
                zIndex     : 5000,
                marginLeft : ofst.left - x,
                marginTop  : ofst.top  - y,
                pointerEvents : "none",
                backfaceVizibility: "hidden",
                "transform" : "translate3d(" + x + "px, " + y + "px, 0)"
            })
            .append(orig.clone().css({
                pointerEvents : "none",
                margin        : 0,
                width         : w + 1,// Webkit rounding bug
                height        : h,
                borderRadius  : orig.css("borderRadius"),
                whiteSpace    : orig.css("whiteSpace"),
                boxSizing     : orig.css("boxSizing"),
                border        : orig.css("border"),
                display       : orig.css("display"),
                padding       : orig.css("padding"),
                boxShadow     : "0 0 0 5px rgba(100, 0, 0, 0.75)"
            }))
            .appendTo("body");
            orig.trigger("dragstart");
        }

        $doc.on("touchmove.dnd", function(event) {

            var touch = event.originalEvent.touches[0],
                _dropTarget,
                dragEnterEvent,
                dragOverEvent;

            event.preventDefault();
            event.stopPropagation();

            x = touch.pageX;
            y = touch.pageY;

            // Get the element below the proxy
            _dropTarget = $(document.elementFromPoint(x, y));

            // Move the proxy to the current touch position
            if (!dragProxy) {
                createProxy();
            } else {
                dragProxy[0].style.transform = "translate3d(" + x + "px, " + y + "px, 0)";
            }

            // Switch the drag-target and trigger dragenter and dragleave if needed
            if (dropTarget && dropTarget[0] != _dropTarget[0]) {
                dropTarget.trigger("dragleave");
                dragEnterEvent = new $.Event("dragenter");
                _dropTarget.trigger(dragEnterEvent);
            }

            dropTarget = _dropTarget;

            // Dispatch the dragover event
            dragOverEvent = new $.Event("dragover");
            dropTarget.trigger(dragOverEvent);

            // Detect if the author has decided to accept the dragged content
            canDrop = dragOverEvent.isDefaultPrevented() ||
                (dragEnterEvent && dragEnterEvent.isDefaultPrevented());
        });

        $doc.on("touchend.dnd", function() {

            if (dropTarget && dropTarget.length && canDrop === true) {
                dropTarget.trigger("drop");
            }

            stopTouchDnD();

            orig.trigger("dragend");
        });
    }


    function initTouchDnD()
    {
        if (!('ontouchend' in document)) {
            return;
        }

        $(document).on("touchstart.initdnd", "[draggable]", function(event) {
            stopTouchDnD();

            // Ignore multi-touch events
            if (event.originalEvent.touches.length > 1) {
                return;
            }

            function start() {
                $(event.target).off(".dnd");
                if (!event.isDefaultPrevented() && !event.isPropagationStopped()) {
                    event.preventDefault();
                    event.stopPropagation();
                    stopTouchDnD();
                    startTouchDnD(event);
                }
            }

            var timer = setTimeout(start, 100);

            $(event.target).on("touchmove.dnd touchend.dnd", function() {
                clearTimeout(timer);
                $(event.target).off(".dnd");
                stopTouchDnD();
            });
        });
    }

    initTouchDnD();
})(jQuery);
