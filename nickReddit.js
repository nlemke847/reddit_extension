var nixReddit = {
	columns: 3,
	currentColumn : 1,
	lastListingName: false,
	slideshowCount: 0,
	activeSubreddit:false,
	thumbnailLeft:true,
	hideNsfw:true,
	ajaxCalls:[]
};

var RedditApi = {
	me:function(){
		$.ajax({
			url: 'http://www.reddit.com/api/me.json',
			dataType: 'json',
			type: 'get',
			complete: function(data) {
				//console.log('complete', data);
			},
			success: function(data) {
				console.log('getMe response', data);
			}
		});
	},
	mySubreddits:function(){
		RedditApi.request("subreddits", { username:localStorage.username, password:localStorage.password, request:'subreddits' });
	},
	request:function(request, data2, elementId){
		console.log('request', data2);
		if(data2.username !== undefined && data2.username !== "" && data2.password !== undefined && data2.password !== ""){
			var data3 = ((data2 != null) ? data2 : { request: request });
			$.ajax({
				url: 'http://www.nicklemke.com/test/reddit_api/reddit_request.php',
				data: data3,
				dataType: 'json',
				type: 'get',
				error: function(data) {
					alert('error with request');
				},
				success: function(data) {
					console.log('test',data);
					if(request == "listings") {
						if(data.data.modhash !== ""){
							handleApiRequest(request,elementId,data);
						} else {
							nixReddit.timeoutID = window.setTimeout(function(){
								openLoginModal();	
							}, 100);
						}
					} else if(request == "subreddits") {
						displaySubreddits(data);
					} else {
						handleApiRequest(request,elementId,data);
					}
				}
			});
		} else {
			console.log('issue');
			nixReddit.timeoutID = window.setTimeout(function(){
				openLoginModal();	
			}, 1000);
		}
	}
};

$(document).ready(function(){
	Shadowbox.init({
	    handleOversize: "resize",
	    onOpen: function(item) { 
			//console.log('opened');
	    },
	    onFinish: function(item){ 
	    	//console.log('finished');
	    	$("#sb-nav-close").removeAttr('onclick');
	    	$("#sb-nav-next").removeAttr('onclick');
	    	$("#sb-nav-previous").removeAttr('onclick');
	    },
	    handleUnsupported: "link"
	});

	bindActionButtons();

	if(localStorage.username){
		setOptions();
		getRedditJSON(null, null, null);
	} else {
		nixReddit.timeoutID = window.setTimeout(function(){
			openLoginModal();	
		}, 1000);		
	}
});

$(window).load(function(){
	tidyTiles();
});

function setOptions(){
	//set local storage options to object and update display elements
	if(localStorage.hideNsfw){
		nixReddit.hideNsfw = localStorage.hideNsfw;
		$('input[name=hideNSFW]').prop("checked", false);
	}
}

function openLoginModal(){
	var username = "",
		password = "";

	if(localStorage.username !== undefined && localStorage.username !== ""){
		username = localStorage.username;
	}

	if(localStorage.password !== undefined && localStorage.password !== ""){
		password = localStorage.password;
	}
	
	Shadowbox.open({
        content:    "<div id='redditLogin'><form action='#'><label for='username'>username:</label><input type='text' name='username' value='"+username+"' /><br /><label for='password'>password:</label><input type='password' name='password' value='"+password+"' /><br /><input type='submit' value='submit' /></form></div>",
        player:     "html",
        title:      "Login to Reddit",
        height:     160,
        width:      310
	});
}


function getRedditJSON(subreddit, limit, after) {
	//console.log(subreddit);
	subreddit = ((subreddit != null) ? 'r/' + subreddit : 'home');
	RedditApi.request("listings",{ username:localStorage.username, password:localStorage.password, request:'listings',subreddit:subreddit, after:after });
}

function updateNameHeading(data){
	console.log('updateNameHeading');
	$('#username').html(localStorage.username);
}

function handleApiRequest(request, elementId, data){
	//console.log('success',elementId);
	var $elem = $("#" + elementId);

	updateNameHeading(data);

	if(request == "upvote"){
		//increase score by one
		var $scoreElem = $('.score', $elem);
		//increase upvote by one
		var $upvoteElem = $('.upvotes', $elem);
		var newUpVoteCount = parseInt($upvoteElem.text().substr(1), 10) + 1;

		$scoreElem.html(parseInt($scoreElem.text(), 10) + 1);
		$upvoteElem.html("(" + newUpVoteCount);
		
		if($elem.hasClass('noLike')){
			$elem.removeClass('noLike');
		}

		$elem.addClass("like");

	} else if(request == "downvote") {
		//increase score by one
		var $scoreElem = $('.score', $elem);
		//increase upvote by one
		var $downvoteElem = $('.downvotes', $elem);
		var newDownVoteCount = parseInt($downvoteElem.text().substr(0,$downvoteElem.text().length - 1), 10) - 1;

		$scoreElem.html(parseInt($scoreElem.text(), 10) - 1);
		$downvoteElem.html(newDownVoteCount + ")");
		
		if($elem.hasClass('like')){
			$elem.removeClass('like');
		}
		
		$elem.addClass("noLike");
	
	} else if(request == "listings") {
		parseListings(data);
		$('.listings').imagesLoaded(function(){
			//console.log('images loaded');
			nixReddit.timeoutID = window.setTimeout(function(){
				tidyTiles();
			}, 1000);
		});
	} else if(request == "save") {
		//console.log('save', $elem, $elem.data('saved'));
		$elem.attr('data-saved', "true");
		$elem.data('saved','true');
	} else if(request == "unsave") {

		//console.log('unsave',$elem, $elem.data('saved'));
		$elem.attr('data-saved', "false");
		$elem.data('saved','false');
	}
}

function scrapeImageFromUrl(url, type, elementId, title){
	var theCall = $.ajax({
		url: url,
		dataType: 'text',
		success: function(scrapData) {
			var imageHtml = "";
			var $scrapData = $(scrapData);
			var slideshow = false;

			//console.log(title);

			if(type == "imgur") {

				if($scrapData.find("img#image").length > 0) {
					//console.log('getting to the imgur image 1', url, $(scrapData).find("#image"));
					imageHtml = $(scrapData).find("#image")[0].innerHTML;

				} else if ($scrapData.find("div#image img").length > 0){
					//console.log('getting to the imgur image 2', url, $(scrapData).find("div#image a img"));
					imageHtml = $(scrapData).find("div#image img")[0].outerHTML;

				} else if ($scrapData.find("div.album-view-image-link a").length > 0){
					var slideshowHtml = "";
					var slideshowIndex = 0;
					var $images = $scrapData.find("div.album-view-image-link a");
					
					if($images.length > 1){
						$images.each(function(){
							var obj = $(this);
							//console.log('photo of slideshow 2', obj);
							
							if(slideshowIndex == 0){
								//console.log('nixReddit.slideshowCount', nixReddit.slideshowCount, "rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'");
								slideshowHtml += "<a href='"+obj.attr('href')+"' rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'><div class='overlay'></div><img src='"+obj.attr('href')+"' /></a>";
							} else {
								slideshowHtml += "<a class='hidden' href='"+obj.attr('href')+"' rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'></a>"
							}
							slideshowIndex++;
						});
						nixReddit.slideshowCount++;
						slideshow = true;
						imageHtml = slideshowHtml;
					} else {
						imageHtml = $scrapData.find("div.image img")[0].outerHTML;
					}
				} else if ($scrapData.find("div.image img").length > 0){
					//console.log('getting to the imgur image 3', url, $(scrapData).find("div.image a"));
					//console.log('slideshow?', $(scrapData).find("div.image a img"));
					var slideshowHtml = "";
					var slideshowIndex = 0;
					var $images = $scrapData.find("div.image img");
					
					if($images.length > 1){
						$images.each(function(){
							var obj = $(this),
								imgSrc = "";

							//console.log('photo of slideshow', obj);
							
							if(slideshowIndex == 0){
								//console.log('nixReddit.slideshowCount', nixReddit.slideshowCount, "rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'");
								slideshowHtml += "<a href='"+obj.attr('src')+"' title='"+obj.attr("alt")+"' rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'><div class='overlay'></div><img src='"+obj.attr('src')+"' /></a>";
							} else {
								slideshowHtml += "<a class='hidden' href='"+obj.attr('src')+"' title='"+obj.attr("alt")+"' rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'></a>"
							}
							slideshowIndex++;
						});
						nixReddit.slideshowCount++;
						slideshow = true;
						imageHtml = slideshowHtml;
					} else {
						imageHtml = $scrapData.find("div.image img")[0].outerHTML;
					}
					
					
					//imageHtml = $(scrapData).find("div.image a")[0].innerHTML;
				} else if($scrapData.find("div.image img").length > 1){
					slideshow = true;
					var slideshowHtml = "";
					var slideshowIndex = 0;
					
					if($scrapData.find("div.image img").length > 1){
						$scrapData.find("div.image img").each(function(){
							var obj = $(this);
							if(slideshowIndex == 0){
								//console.log('nixReddit.slideshowCount', nixReddit.slideshowCount, "rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'");
								slideshowHtml += "<a href='"+obj.data("src")+"' title='"+obj.attr("alt")+"' rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'><div class='overlay'></div><img src='"+obj.data("src")+"' /></a>";
							} else {
								slideshowHtml += "<a class='hidden' href='"+obj.data("src")+"' title='"+obj.attr("alt")+"' rel='shadowbox[Gallery"+nixReddit.slideshowCount+"]'></a>"
							}
							slideshowIndex++;
						});
						nixReddit.slideshowCount++;
						slideshow = true;
						imageHtml = slideshowHtml;
					} else {
						imageHtml = $scrapData.find("div.image img")[0].outerHTML;
					}
				}
				
			} else if(type == "quick") {
				imageHtml = $scrapData.find("img#img")[0].outerHTML;
			} else if(type == "livememe") {
				imageHtml = $scrapData.find("img#memeImage")[0].outerHTML;
			} else if(type == "instagram") {
				imageHtml = $scrapData.find("img.photo")[0].outerHTML;
			}

			if(imageHtml != ""){
				if($("#"+elementId).length > 0){
					//console.log('embed image to', "#"+elementId);
					var $targetElem = $("#"+elementId),
						newElem = $("<div class='listingImage'></div>");
						$imageHtml = $(imageHtml);

					if(!slideshow){
						if($imageHtml.attr('height')){
							imageHtml = $imageHtml.removeAttr("height");
						}

						if($imageHtml.parent("a").length < 1){
							imageHtml = $imageHtml.wrap(function() {
							  return '<a rel="shadowbox" href="' + $(this).attr("src") + '" />'
							});
							imageHtml = $imageHtml.parent();
						}
						
						if(!$imageHtml.attr('rel')){
							$imageHtml.attr('rel', 'shadowbox');
						}
					}	
					newElem.html(imageHtml);
					$targetElem.prepend(newElem);
				}				
			}
			Shadowbox.setup();

			return true;
	     }
	});
	return theCall;
}

function parseListings(redditResponse) {
	//console.log('redditJSON', redditResponse);
	var listingHTML = "";

	$(redditResponse.data.children).each(function(){
		
		var currentItem = this.data,
			listingImage = false,
			nsfwClass = ((currentItem.over_18 && nixReddit.hideNsfw !== "false") ? 'nsfw' : ''),
			liked = "";
		
		if(currentItem.likes === null){
			liked = "";
			
		} else if (currentItem.likes === false) {
			liked = "noLike";
		} else if (currentItem.likes === true) {
			liked = "like";
		}

		var htmlOutput = "<li><div class='listingItem clearfix "+liked+" "+nsfwClass+"' id='"+currentItem.id+"' data-name='"+currentItem.name+"' data-saved='"+currentItem.saved+"'>";

		//check for media
		parseMediaFromListing(currentItem, htmlOutput);
	});

	$.when(nixReddit.ajaxCalls).done(function(){
		//console.log('the ajax calls are done');
		// nixReddit.timeoutID = window.setTimeout(function(){
		// 	console.log('***DO IT***');
		// 	tidyTiles();
		// }, 2000);
	});
}

function parseMediaFromListing(currentItem, htmlOutput) {
	var mediaResponse = false
		currentListingText = false;

	switch(currentItem.domain) {
		case "i.imgur.com":
			//example url http://i.imgur.com/ozT8b6N.png?1
			//should be full size image in url
			if(currentItem.url.substr(-3) == "jpg" || currentItem.url.substr(-3) == "gif" || currentItem.url.substr(-3) == "png"){
				htmlOutput += "<div class='listingImage'><a href='" + currentItem.url + "' rel='shadowbox'><img src='" + currentItem.url + "' /></a></div>";
			} else {
				nixReddit.ajaxCalls.push(scrapeImageFromUrl(currentItem.url, "imgur", currentItem.id, currentItem.title));
			}
			mediaResponse = true;
			break;

		case "imgur.com":
			//url example http://imgur.com/a/jZWbj
			//need to scrape image(s) from url
			nixReddit.ajaxCalls.push(scrapeImageFromUrl(currentItem.url, "imgur", currentItem.id, currentItem.title));
			mediaResponse = true;
			break;

		case "qkme.me":
			//url example http://qkme.me/3ti7qw
			//need to scrape image from url
			//console.log('qkme.me', currentItem);
			nixReddit.ajaxCalls.push(scrapeImageFromUrl(currentItem.url, "quick", currentItem.id, currentItem.title));
			mediaResponse = true;
			break;

		case "quickmeme.com":
			nixReddit.ajaxCalls.push(scrapeImageFromUrl(currentItem.url, "quick", currentItem.id, currentItem.title));
			mediaResponse = true;
			break;

		case "youtube.com":
			//youtube embed is currentItem.media.oembed
			//thumbnail url = currentItem.media.oembed.thumbnail_url 
			//console.log('youtube',currentItem);
			if(currentItem.media.oembed){
				htmlOutput += "<div class='listingImage youtube clearfix'><a href='#' data-content='"+currentItem.media_embed.content+"' data-width='"+currentItem.media_embed.width+"' data-height='"+currentItem.media_embed.height+"'><div class='overlay'></div><img src='" + currentItem.media.oembed.thumbnail_url + "' /></a></div>";
				mediaResponse = true;
			}
			break;

		case "youtu.be":
			if(currentItem.media.oembed){
				htmlOutput += "<div class='listingImage youtube clearfix'><a href='#' data-content='"+currentItem.media_embed.content+"' data-width='"+currentItem.media_embed.width+"' data-height='"+currentItem.media_embed.height+"'><div class='overlay'></div><img src='" + currentItem.media.oembed.thumbnail_url + "' /></a></div>";
				mediaResponse = true;
			}
			break;

		case "livememe.com":
			nixReddit.ajaxCalls.push(scrapeImageFromUrl(currentItem.url, "livememe", currentItem.id, currentItem.title));
			mediaResponse = true;
			break;

		case "instagram.com":
			nixReddit.ajaxCalls.push(scrapeImageFromUrl(currentItem.url, "instagram", currentItem.id, currentItem.title));
			mediaResponse = true;
			break;
			
		default: 
			var selfRegEx = "self.";
			var found = currentItem.domain.indexOf(selfRegEx);
			if(found >= 0){
				//we have an internal reddit page self.{somesubreddit}
				//console.log('internal reddit page', currentItem);
				if(currentItem.selftext) {
					var listingIntro = trim(currentItem.selftext, 40);
					currentListingText = "<p>" + listingIntro + "...</p>";
				}
			} else {
				//some external site
				//check for gif or jpg or png at the end of the url
				if(currentItem.url.substr(-3) == "jpg" || currentItem.url.substr(-3) == "gif" || currentItem.url.substr(-3) == "png"){
					htmlOutput += "<div class='listingImage external'><a href='" + currentItem.url + "' rel='shadowbox'><img src='" + currentItem.url + "' /></a></div>";
					mediaResponse = true;
				}
				//console.log('check for image url');
			}
	}
	titleAndThumbnail({'mediaResponse':mediaResponse, 'htmlOutput':htmlOutput, 'currentListingText':currentListingText}, currentItem);
}

function titleAndThumbnail(mediaResponse,currentItem){
	var htmlOutput = mediaResponse.htmlOutput;

	if(mediaResponse.mediaResponse){
		if(currentItem.permalink.substr(0,2) == "/r"){
			htmlOutput += "<div class='listingTitle clearfix'><h2><a target='_blank' href='http://www.reddit.com" + currentItem.permalink + "'>" + currentItem.title + "</a></h2></div>";
		} else {
			htmlOutput += "<div class='listingTitle clearfix'><h2><a target='_blank' href='" + currentItem.permalink + "'>" + currentItem.title + "</a></h2></div>";
		}
	} else {
		htmlOutput += "<div class='listingTitle clearfix'>";

		if(currentItem.thumbnail == "self"){
			htmlOutput += "<div class='selfThumbnail'></div>";
		} else if(currentItem.thumbnail == "default"){
			htmlOutput += "<div class='defaultThumbnail'></div>";
		} else if(currentItem.thumbnail != ""){
			var thumbNailClass = "right";
			if(nixReddit.thumbnailLeft){
				thumbNailClass = "left";
				nixReddit.thumbnailLeft = false;
			} else {
				nixReddit.thumbnailLeft = true;
			}
			htmlOutput += "<img class='" + thumbNailClass + "' src ='" + currentItem.thumbnail + "' />";
		}
		
		htmlOutput += "<h2><a href='" + currentItem.url + "' target='_blank'>" + currentItem.title + "</a></h2></div>";
	}

	if(mediaResponse.currentListingText) {
		htmlOutput += mediaResponse.currentListingText;
	}



	htmlOutput += "<div class='meta clearfix'><span class='score'>" + currentItem.score + "</span><span class='upvotes'>(" + currentItem.ups + "</span>/<span class='downvotes'>" + currentItem.downs + ")</span><span class='author'>" + currentItem.author + "</span><span class='domain'>" + currentItem.domain + "</span></div>"
	
	htmlOutput += '<div class="seeActions"></div>';
	htmlOutput += '<div class="actionWrapper clearfix" style="display:none">';
	htmlOutput += "<div class='vote clearfix'><a class='up'>up</a><a class='down'>down</a></div>";
	htmlOutput += "<a class='save'>save</a>";
	htmlOutput += '</div>'; //close actionWrapper
	htmlOutput += "</div></li>"; //close containing .listingItem and li

	columnize(htmlOutput);

	nixReddit.lastListingName = currentItem.name;
}

function chooseColumnBySize(){
	var col1Height = $(".column1").height(),
		col2Height = $(".column2").height(),
		col3Height = $(".column3").height(),
		chosenColumn = 1;

	//console.log('columnSizes', col1Height, col2Height, col3Height);

	if(col1Height > col2Height){
		chosenColumn = 2;
	}

	if(chosenColumn == 2){
		if(col2Height > col3Height){
			chosenColumn = 3;
		}
	} else {
		if(col1Height > col3Height){
			chosenColumn = 3;
		}
	}
	//console.log('chosen column', chosenColumn);
	return chosenColumn;

}

function chooseTallestColumn(){
	var col1Height = $(".column1").height(),
		col2Height = $(".column2").height(),
		col3Height = $(".column3").height(),
		chosenColumn = 1;

	//console.log('columnSizes', col1Height, col2Height, col3Height);

	if(col1Height < col2Height){
		chosenColumn = 2;
	}

	if(chosenColumn == 2){
		if(col2Height < col3Height){
			chosenColumn = 3;
		}
	} else {
		if(col1Height > col3Height){
			chosenColumn = 1;
		}
	}
	//console.log('chosen column', chosenColumn);
	return chosenColumn;

}

function columnize(listItem){
	//console.log(nixReddit.currentColumn, 'nixReddit.currentColumn', nixReddit.columns, 'nixReddit.columns');
	var colNum = chooseColumnBySize();
	$(".column" + colNum + " ul").append(listItem);
}

function tidyTiles(){
	//console.log('tidy');
	if(columnizeAll()){
		tidyTiles();
	}
}

function columnizeAll(){
	var tallestColumn = chooseTallestColumn(),
		columnHeights = calculateColumnHeights(),
		offsets = calculateOffsets(tallestColumn, columnHeights.one, columnHeights.two, columnHeights.three);
	
	//console.log(tallestColumn,columnHeights,offsets);

	if(offsets.columnOffset1 > 240 || offsets.columnOffset2 > 240){
		var $targetColumn = false;
		//we should make updates
		if(tallestColumn == 1){
			if(offsets.columnOffset1 > offsets.columnOffset2){
				//third column is next tallest
				targetColumn = 'column2';
			} else {
				//second column is second highest
				targetColumn = 'column3';
			}
		} else if(tallestColumn == 2){
			if(offsets.columnOffset1 > offsets.columnOffset2){
				//third column is next tallest
				targetColumn = 'column1';
			} else {
				//second column is second highest
				targetColumn = 'column3';
			}
		} else if(tallestColumn == 3){
			if(offsets.columnOffset1 > offsets.columnOffset2){
				//third column is next tallest
				targetColumn = 'column1';
			} else {
				//second column is second highest
				targetColumn = 'column2';
			}
		}

		var $lastElementInTallestColumn = $('.column'+tallestColumn+' .listingItem:last').parent(),
			lastElementInTallestColumnHeight = $lastElementInTallestColumn.height(),
			$targetColumn = $('.'+targetColumn+' ul');

		if(checkItemFitAndPlace($lastElementInTallestColumn,lastElementInTallestColumnHeight, offsets, $targetColumn)){
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

function checkItemFitAndPlace($lastElementInTallestColumn,lastElementInTallestColumnHeight, offsets, $targetColumn){
	if(lastElementInTallestColumnHeight < offsets.columnOffset1 || lastElementInTallestColumnHeight < offsets.columnOffset1) {
		//item is smaller than the offset of other columns
		placeItemInNewColumn($lastElementInTallestColumn,$targetColumn);
		return true;
	} else {
		//go to previous item 
		$lastElementInTallestColumn = $lastElementInTallestColumn.prev();
		
		if($lastElementInTallestColumn.length > 0){
			lastElementInTallestColumnHeight = $lastElementInTallestColumn.height();
			checkItemFitAndPlace($lastElementInTallestColumn,lastElementInTallestColumnHeight, offsets, $targetColumn);
		} else {
			//no more items left in column break out of 
			return false;
		}
	}
}

function placeItemInNewColumn($lastElementInTallestColumn, $targetColumn){
	$lastElementInTallestColumn.appendTo($targetColumn);
}

function calculateOffsets(tallestColumn, columnOneHeight, columnTwoHeight, columnThreeHeight){
	var columnOffset1 = 0,
		columnOffset2 = 0;

	if(tallestColumn == 1){
		columnOffset1 = columnOneHeight - columnTwoHeight; // 200
		columnOffset2 = columnOneHeight - columnThreeHeight; // 100
	} else if(tallestColumn == 2){
		columnOffset1 = columnTwoHeight - columnOneHeight;
		columnOffset2 = columnTwoHeight - columnThreeHeight;
	} else if(tallestColumn == 3){
		columnOffset1 = columnThreeHeight - columnOneHeight;
		columnOffset2 = columnThreeHeight - columnTwoHeight;
	}
	return {
		'columnOffset1':columnOffset1,
		'columnOffset2':columnOffset2
	}
}

function calculateColumnHeights(){
	var columnOneHeight = 0,
		columnTwoHeight = 0,
		columnThreeHeight = 0;

	$('.column1, .column2, .column3').each(function(){ 
		//console.log($(this));
		var $this = $(this);
		if($this.hasClass('column1')){
			columnOneHeight = $this.height();
		} else if($this.hasClass('column2')){
			columnTwoHeight = $this.height();
		} else if($this.hasClass('column3')){
			columnThreeHeight = $this.height();
		}
	});
	return {
		'one':columnOneHeight,
		'two':columnTwoHeight,
		'three':columnThreeHeight
	}
}

function trim(string, length) {
    var trimmed = string.split(' ').slice(0, length),
        idx = 0;

    for (string = ""; idx < trimmed.length; string += trimmed[idx++] + ' ');

    return string;
}

function bindActionButtons() {
	$("#loadMore").on("click", function(){
		var redditJSON = false;

		if(nixReddit.activeSubreddit){
			redditJSON = getRedditJSON(nixReddit.activeSubreddit, null, nixReddit.lastListingName);
		} else {
			redditJSON = getRedditJSON(null, null, nixReddit.lastListingName);
		}
	});

	//fixing shadowbox "onclick" issues with chrome extension
	$("body").on("click", "#sb-nav-close", function(){
		Shadowbox.close();
	});
	
	$("body").on("click", "#sb-nav-next", function(){
		Shadowbox.next();
	});

	$("body").on("click", "#sb-nav-previous", function(){
		Shadowbox.previous();
	});


	$("body").on("click", ".youtube a", function(e){
		e.preventDefault();
		var content = $(this).data("content");
		var width = $(this).data("width");
		var height = $(this).data("height");

		Shadowbox.open({
	        content:    content,
	        player:     "html",
	        height:     height,
	        width:      width
    	});
	});

	$('#getMe').click(function(e){
		e.preventDefault();
		//console.log('getMe');
		RedditApi.me();
	});

	$('#mySubreddits').click(function(e){
		e.preventDefault();
		//console.log('mySubreddits click');
		if($('.subRedditsContainer').length > 0){
			showHideSubreddits();
		} else {
			RedditApi.mySubreddits();
		}
	});

	$('body').on('click', '.searchSubreddits button', function(){
		var subreddit = $(this).siblings('input:first').val();
		newSubreddit(subreddit);
	});

	$('body').on('click', '.subreddits li:not(".searchSubreddits")', function(){
		var subreddit = $(this).children("a").data('subreddit');
		newSubreddit(subreddit);
	});

	$('h1.replace').on('click',function(){
		location.reload(true);
	});

	$('#getUserInfo').click(function(e){
		e.preventDefault();
		//console.log('getUserInfo');
		RedditApi.getUserInfo();
	});

	$('body').on('click','.vote .up, .vote .down', function(){
		var $listingItem = $(this).parent().parent().parent();
		if($(this).hasClass('up')){
			RedditApi.request('upvote', { username:localStorage.username, password:localStorage.password, request: 'upvote', listingId: $listingItem.data("name")}, $listingItem.attr("id"));
		} else {
			RedditApi.request('downvote', { username:localStorage.username, password:localStorage.password, request: 'downvote', listingId: $listingItem.data("name")}, $listingItem.attr("id"));
		}
	});

	$('body').on('click','.save', function(){
		var $listingItem = $(this).parents('.listingItem');
		//console.log("$listingItem.data('saved')",$listingItem.data('saved'));
		if($listingItem.data('saved') === "false" || $listingItem.data('saved') === false ){
			RedditApi.request('save', { username:localStorage.username, password:localStorage.password, request:'save', name: $listingItem.data("name")}, $listingItem.attr("id") );
		} else {
			RedditApi.request('unsave', { username:localStorage.username, password:localStorage.password, request:'unsave', name: $listingItem.data("name")}, $listingItem.attr("id"));
		}
	});

	$('body').on('click', '.seeActions', function(){
		//console.log('.seeActions', $(this));
		$this = $(this);
		if($this.hasClass('active')){
			//close actions
			//console.log('active');
			$this.siblings('.actionWrapper').slideUp('fast', function() {
			    $this.removeClass('active');
  			});
		} else {
			//console.log('siblings', $this.siblings('.actionWrapper'));
			$this.siblings('.actionWrapper').slideDown('fast', function() {
			    $this.addClass('active');
  			});
			
		}
	});

	$('body').on('submit', '#redditLogin form', function(e) {
		e.preventDefault();
		var $this = $(this),
			username = $this.children('input[name=username]');
			password = $this.children('input[name=password]');

		if(username.val() != "" && password.val() != ""){
			localStorage.username = username.val();
			localStorage.password = password.val();
			Shadowbox.close();
			getRedditJSON(null, null, null);
			//dont think we need this here
			//bindActionButtons();
		} else {
			if($this.siblings('errors').length > 0){
				$this.siblings('errors').remove();
			}
			$this.parent().prepend('<div class="errors">Please enter your Reddit username and password</div>');
		}
	});

	$('#login').on('click', function(){
		//console.log('login');
		openLoginModal();	
	});

	$('body').on('click', '#options', function(){
		$(this).siblings("ul").toggle();
	});

	$('.options input[type=checkbox]').click(function(){
		console.log('options clicked', this, $(this).prop('checked'));
		$this = $(this);
		if($this.attr('name') == 'hideNSFW'){
			if(nixReddit.hideNsfw == true){
				console.log('changing to false');
				//show all the nsfw that are currently on the page
				$('.listingItem .nsfw').each(function(){
					$(this).removeClass('nsfw');
				});
			}
			nixReddit.hideNsfw = $this.prop('checked');
			localStorage.hideNsfw = $this.prop('checked');
		}
	});
}

function newSubreddit(subreddit){
	if(!nixReddit.activeSubreddit || nixReddit.activeSubreddit != subreddit) {
		clearListings();
		getRedditJSON(subreddit, null, null);
		nixReddit.activeSubreddit = subreddit;
	}
}

function clearListings(){
	$(".column1, .column2, .column3").each(function(){
		$(this).children().children().remove();
	});
}

function displaySubreddits(data){
	if(data.data.children.length > 0){
		var subredditHtml = "<div class='subRedditsContainer'><ul class='subreddits'><li class='searchSubreddits'><input type='text' name='subreddit' placeholder='go to subreddit' /><button value='>' /></li>";
		$(data.data.children).each(function(){
			subredditHtml += "<li><a data-subreddit='" + this.data.display_name + "' data-name='" + this.data.display_name + "'>" + this.data.display_name + "</li>";
		});
		subredditHtml += "</ul></div>";
		if($('ul.subreddits').length > 0){
			$('ul.subreddits').remove();
		}
		$('body').append(subredditHtml);

		showHideSubreddits();
	}
}

function showHideSubreddits(){
	if($('.subRedditsContainer').css("left") == "-140px"){
		$('.subRedditsContainer').animate({
			left: '+=140'
		}, 500, function() {
			$("#mySubreddits").text("Hide Subreddits");
		});
	} else {
		$('.subRedditsContainer').animate({
			left: '-=140'
		}, 500, function() {
			$("#mySubreddits").text("Show Subreddits");
		});
	}
}

function cleanupColumns(){
	//something to resort columns
}

/*
example response

approved_by: null
author: "mirandaconpete"
author_flair_css_class: null
author_flair_text: null
banned_by: null
clicked: false
created: 1364169609
created_utc: 1364140809
distinguished: null
domain: "i.imgur.com"
downs: 1530
edited: false
hidden: false
id: "1ax19f"
is_self: false
likes: null
link_flair_css_class: null
link_flair_text: null
media: null
media_embed: Object
name: "t3_1ax19f"
num_comments: 97
num_reports: null
over_18: false
permalink: "/r/funny/comments/1ax19f/talk_about_embarrassing_baby_pictures/"
saved: false
score: 2038
selftext: ""
selftext_html: null
subreddit: "funny"
subreddit_id: "t5_2qh33"
thumbnail: ""
title: "talk about embarrassing baby pictures.."
ups: 3568
url: "http://i.imgur.com/q9f2ejG.jpg"
*/

/* 
example RedditApi.me response

{"kind": "t2", "data": {"has_mail": false, "name": "n2dal", "is_friend": false, "created": 1308860380.0, "modhash": "6x4eez25tgec6a2ab53c3970ea73cb18d766f75ae99e006663", "created_utc": 1308856780.0, "link_karma": 82, "comment_karma": 2320, "over_18": true, "is_gold": false, "is_mod": false, "id": "5f1pm", "has_mod_mail": false}}

*/
