//
// Copyright (c) 2018-2019 Håkan Edling
//
// This software may be modified and distributed under the terms
// of the MIT license.  See the LICENSE file for details.
//
// http://github.com/piranhacms/piranha.core
//

/*global
    piranha, baseUrl, sortable
 */

if (typeof(piranha)  == "undefined") {
    piranha = {};
}

piranha.blocks = new function() {
    "use strict";

    var self = this;

    self.selectedIndex = null;

    /**
     * Initializes the block component.
     */
    self.init = function () {
        // Create block type list
        var types = sortable(".block-types", {
            items: ":not(.unsortable)",
            acceptFrom: false,
            copy: true
        });

        // Create the main block list
        var blocks = sortable(".blocks", {
            handle: ".sortable-handle",
            items: ":not(.unsortable)",
            acceptFrom: ".blocks,.block-types"
        });

        // Create the block group lists
        var groups = sortable(".block-group-list .list-group", {
            items: ":not(.unsortable)",
            acceptFrom: ".block-group-list .list-group,.block-types"
        });

        types[0].addEventListener("sortstart", function (e) {
            $(".block-add.active").removeClass("active");
            self.selectedIndex = null;
        });

        //
        // Add sortable events for block groups
        //
        for (var n = 0; n < groups.length; n++) {
            groups[n].addEventListener("sortupdate", function (e) {
                // Get the destination index, the moved item and the block list
                var destination = e.detail.destination.index;
                var item = $("#" + $(e.detail.item).attr("data-id"));

                // Detach the moved item from the block list
                $(item).detach();

                // Get the current item list with the moved item detached
                var list = $(e.detail.item).closest(".block-group").find(".block-group-item");

                // Add it back to the destination position
                if (destination > 0) {
                    $(item).insertAfter(list.get(destination - 1));
                } else {
                    $(item).insertBefore(list.get(0));
                }

                // Recalc form indexes
                self.recalcBlocks();
            });
        }

        //
        // Add sortable events for blocks
        //
        blocks[0].addEventListener("sortupdate", function (e) {
            var item = e.detail.item;

            if ($(item).hasClass("block-type")) {
                //
                // New block dropped in block list, create and
                // insert editor view.
                //
                self.createBlock(item, e.detail.destination.index);
            } else {
                // Recalc form indexes
                self.recalcBlocks();
            }
        });
    };

    /**
     * Inserts the given block at the specified index.
     *
     * @param {*} block The block
     * @param {*} index The new position index
     */
    self.insertBlock = function (block, index) {
        // Add the new block at the requested position
        block.insertBefore($(".blocks .block-item").get(index));

        // If the new region contains a html editor, make sure
        // we initialize it.
        block.find(".block-editor").each(function () {
            addInlineEditor("#" + this.id);
        });

        // Update the sortable list
        sortable(".blocks", {
            handle: ".sortable-handle",
            items: ":not(.unsortable)",
            acceptFrom: ".blocks,.block-types"
        });

        // Recalc form indexes
        self.recalcBlocks();
    };

    /**
     * Creates a new block and inserts it at
     * the specified index.
     *
     * @param {*} item The selected block type item
     * @param {*} index The new position index
     */
    self.createBlock = function (item, index) {
        $.ajax({
            url: piranha.baseUrl + "manager/block/create",
            method: "POST",
            contentType: "application/json",
            dataType: "html",
            data: JSON.stringify({
                TypeName: $(item).data("typename"),
                BlockIndex: index
            }),
            success: function (res) {
                // Remove the block-type container
                $(".blocks .block-type").remove();

                // Insert the create block
                self.insertBlock($(res), index);

                // Deactiveate the block panel
                $("#panelBlocks").removeClass("active");
                $(".block-add.active").removeClass("active");
                $("#block-search").val("");

                // Reset focus
                if (self.selectedIndex != null)
                {
                    if (piranha.prevFocus) {
                        piranha.prevFocus.focus();
                        piranha.prevFocus = null;
                    } else {
                        $(":focus").blur();
                    }
                }
                // Clear selected index
                self.selectedIndex = null;
            }
        });
    };

    /**
     * Selects an item in a block group list.
     *
     * @param {*} elm The block to select.
     */
    self.selectGroupItem = function (elm) {
        // Activate/deactivate list items
        elm.parent().find(".list-group-item").removeClass("active");
        elm.addClass("active");

        // Hide/show item details
        elm.closest(".block-group").find(".block-group-item:not(.d-none)").addClass("d-none");
        $("#" + elm.attr("data-id")).removeClass("d-none");
    };

    /**
     * Removes the given block from the current page.
     *
     * @param {*} elm The block to remove.
     */
    self.removeBlock = function (elm) {
        // Remove the block
        elm.remove();

        // Recalc form indexes
        self.recalcBlocks();
    };

    /**
     * Recalculates all form elements after an item has been
     * moved or inserted in the UI.
     */
    self.recalcBlocks = function () {
        var items = $(".body-content .blocks > .block-item .block");

        for (var n = 0; n < items.length; n++) {
            var inputs = $(items.get(n)).find("input, textarea, select");

            inputs.attr("id", function (i, val) {
                if (val) {
                    return val.replace(/Blocks_\d+__/, "Blocks_" + n + "__");
                }
                return val;
            });
            inputs.attr("name", function (i, val) {
                if (val) {
                    return val.replace(/Blocks\[\d+\]/, "Blocks[" + n + "]");
                }
                return val;
            });

            var content = $(items.get(n)).find("[contenteditable=true]");
            content.attr("data-id", function (i, val) {
                if (val) {
                    return val.replace(/Blocks_\d+__/, "Blocks_" + n + "__");
                }
                return val;
            });

            var media = $(items.get(n)).find("button");
            media.attr("data-mediaid", function (i, val) {
                if (val) {
                    return val.replace(/Blocks_\d+__/, "Blocks_" + n + "__");
                }
                return val;
            });

            var subitems = $(items.get(n)).find(".block-group-item");

            for (var s = 0; s < subitems.length; s++) {
                var subInputs = $(subitems.get(s)).find("input, textarea, select");

                subInputs.attr("id", function (i, val) {
                    if (val) {
                        return val.replace(/Blocks_\d+__Items_\d+__/, "Blocks_" + n + "__Items_" + s + "__");
                    }
                    return val;
                });
                subInputs.attr("name", function (i, val) {
                    if (val) {
                        return val.replace(/Blocks\[\d+\].Items\[\d+\]/, "Blocks[" + n + "].Items[" + s + "]");
                    }
                    return val;
                });

                var subContent = $(subitems.get(s)).find("[contenteditable=true]");
                subContent.attr("data-id", function (i, val) {
                    if (val) {
                        return val.replace(/Blocks_\d+__Items_\d+__/, "Blocks_" + n + "__Items_" + s + "__");
                    }
                    return val;
                });

                var subContent = $(subitems.get(s)).find("button");
                subContent.attr("data-mediaid", function (i, val) {
                    if (val) {
                        return val.replace(/Blocks_\d+__Items_\d+__/, "Blocks_" + n + "__Items_" + s + "__");
                    }
                    return val;
                });
            }
        }
    };

    self.filter = function (str) {
        var toLower = str.toLowerCase();

        if (toLower != "") {
            $.each($("#panelBlocks .block-type"),
            function(i, e) {
                var blockType = $(e);
                var name = blockType.find("span").text().toLowerCase();

                if (name.includes(toLower)) {
                    blockType.show();
                } else {
                    blockType.hide();
                }
            });
            $("#panelBlocks .block-category").hide();
        } else {
            $("#panelBlocks .block-category, #panelBlocks .block-type").show();
        }

    };

    $(document).on("click", ".block-type a", function (e) {
        e.preventDefault();

        if (self.selectedIndex != null) {
            self.createBlock($(this).parent(), self.selectedIndex + 1);
        }
    });

    $(document).on("click", ".block-add", function (e) {
        var block = $(this).closest(".block-item");
        self.selectedIndex = $(this).closest(".blocks").find(".block-item").index(block);
        $(this).addClass("active");
    });

    $(document).on("click", ".block-remove", function (e) {
        e.preventDefault();
        self.removeBlock($(this).closest(".block-item"));
    });

    $(document).on("focus", ".block .empty", function () {
        $(this).removeClass("empty");
        $(this).addClass("check-empty");
    });

    $(document).on("blur", ".block .check-empty", function () {
        //if (piranha.tools.isEmpty(this)) {
        if (manager.tools.isempty(this)) {
            $(this).removeClass("check-empty");
            $(this).addClass("empty");
        }
    });

    // Insert block on enter
    $("#block-search").on("keypress", function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();

            if (self.selectedIndex != null) {
                var  result = $(".block-type:visible");

                if (result.length === 1) {
                    // There's only a single media file left in
                    // the result list, let's click it
                    result.find("a").click();
                }
            }
        }
    });

    $(document).on("click", ".block-group-list .list-group a", function (e) {
        e.preventDefault();
        self.selectGroupItem($(this));
    });

    $(document).on("click", ".block-html-swap", function(e) {
        e.preventDefault();

        var columns = $(this).parent().parent().find(".block-editor");
        if (columns.length === 2) {
            var col1 = $(columns[0]).html();
            var col2 = $(columns[1]).html();

            $(columns[0]).html(col2);
            $(columns[1]).html(col1);
        }
    });

    $(document).on("keyup",
        "#block-search",
        function(e) {
            e.preventDefault();

            self.filter($("#block-search").val());
        });
};