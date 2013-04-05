var nixReddit = (function () {
	
	var settings, api, shadowbox;

	settings = {
		columns: 3,
		currentColumn : 1,
		lastListingName: false,
		slideshowCount: 0,
		activeSubreddit:false,
		thumbnailLeft:true,
		ajaxCalls:[]
	};

	api = {
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
			console.log('here');
			$.ajax({
				url: 'http://www.reddit.com/subreddits/mine/subscriber.json',
				dataType: 'json',
				type: 'get',
				complete: function(data) {
					//console.log('complete', data);
				},
				success: function(data) {
					console.log('mySubreddits response', data);
					displaySubreddits(data);
				}
			});
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
						if(data2.request == "listings") {
							if(data.data.modhash !== ""){
								nixReddit.handleApiRequest(request,elementId,data);
							} else {
								nixReddit.timeoutID = window.setTimeout(function(){
									nixReddit.openLoginModal();	
								}, 100);
							}
						} else {
							nixReddit.handleApiRequest(request,elementId,data);
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

	var handleApiRequestion = function(request, elementId, data){
		//console.log('success',elementId);
		var $elem = $("#" + elementId);

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

			$('img').imagesLoaded(function(){
				console.log('images loaded');
			});

			$('img').imagesLoaded({
			    done: function ($images) {
			    	console.log('done loading images');
			    },
			    fail: function ($images, $proper, $broken) {},
			    always: function () {},
			    progress: function (isBroken, $images, $proper, $broken) {}
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

	return {
		var shadowbox, openLoginModal, bindActionButtons, timeoutID;

		shadowbox = {
			init:function(){
				Shadowbox.init({
				    handleOversize: "resize",
				    modal: true,
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
			},
			handlers:function(){
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
			}
		};

		openLoginModal:function(){
			var username = "",
				password = "";

			if(localStorage.username !== undefined && localStorage.username !== ""){
				username = localStorage.username;
			}

			if(localStorage.password !== undefined && localStorage.password !== ""){
				password = localStorage.password;
			}

			nixReddit.timeoutID = window.setTimeout(function(){
				Shadowbox.open({
			        content:    "<div id='redditLogin'><form action='#'><label for='username'>username:</label><input type='text' name='username' value='"+username+"' /><br /><label for='password'>password:</label><input type='password' name='password' value='"+password+"' /><br /><input type='submit' value='submit' /></form></div>",
			        player:     "html",
			        title:      "Login to Reddit",
			        height:     160,
			        width:      310
				});	
			}, 1000);	
		}

		getRedditJSON:function(subreddit, limit, after) {
			console.log(subreddit);
			subreddit = ((subreddit != null) ? 'r/' + subreddit : 'home');
			nixReddit.api.request("listings",{ username:localStorage.username, password:localStorage.password, request:'listings',subreddit:subreddit, after:after });
		}

		bindActionButtons:function(){
			$("#loadMore").on("click", function(){
				var redditJSON = false;

				if(nixReddit.activeSubreddit){
					redditJSON = getRedditJSON(nixReddit.activeSubreddit, null, nixReddit.lastListingName);
				} else {
					redditJSON = getRedditJSON(null, null, nixReddit.lastListingName);
				}
			});

			nixReddit.shadowbox.handlers();

			$('#login').on('click', function(){
				console.log('login');
				nixReddit.openLoginModal();	
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

			//show/hide subreddits
			$('#mySubreddits').click(function(e){
				e.preventDefault();
				console.log('mySubreddits click');
				if($('.subRedditsContainer').length > 0){
					showHideSubreddits();
				} else {
					RedditApi.mySubreddits();
				}
			});

			//change subreddits
			$('body').on('click', '.subreddits li', function(){
				var subreddit = $(this).children("a").data('subreddit');
				if(!nixReddit.activeSubreddit || nixReddit.activeSubreddit != subreddit) {
					clearListings();
					getRedditJSON(subreddit, null, null);
					nixReddit.activeSubreddit = subreddit;
				}	
			});

			//logo in header reloads home page
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
				console.log('testing');
				var $this = $(this),
					username = $this.children('input[name=username]');
					password = $this.children('input[name=password]');

				if(username.val() != "" && password.val() != ""){
					localStorage.username = username.val();
					localStorage.password = password.val();
					Shadowbox.close();
					var redditJSON = getRedditJSON(null, null, null);
					bindActionButtons();
				} else {
					if($this.siblings('errors').length > 0){
						$this.siblings('errors').remove();
					}
					$this.parent().prepend('<div class="errors">Please enter your Reddit username and password</div>');
				}
			});

			$('#getMe').click(function(e){
				e.preventDefault();
				//console.log('getMe');
				RedditApi.me();
			});
		}
	};
});

$(document).ready(function(){
	nixReddit.shadowbox.init();
	nixReddit.bindActionButtons();

	if(localStorage.username){
		getRedditJSON(null, null, null);
	} else {
		nixReddit.timeoutID = window.setTimeout(function(){
			nixReddit.openLoginModal();	
		}, 1000);		
	}
});

$(window).load(function(){
	tidyTiles();
});
