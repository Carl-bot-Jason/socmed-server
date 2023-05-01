const express = require('express');
const router = express.Router();

const {
	postLogin,
	postSignup,
	getCommunity,
	getCommunities,
	getRecentCommunities,
	getProfile,
	createCommunity,
	getHomePosts,
	postHomePost,
	getMember,
	setMember,
	deleteMember,
	getAdmin,
	setAdmin,
	deleteAdmin,
	getUsername,
	getFollow,
	setFollow,
	deleteFollow,
	getFeedPosts,
	postFeedPost,
	updateBanner,
	getSearch,
	testing
} = require('./controllers/controller');

const {
	getPrivateMessages,
	postPrivateMessage,
	getCommunityMessages,
	postCommunityMessage,
	getContacts,
	postContact,
	getChatRoomPrivate
} = require('./controllers/chat');

router.route('/login').post(postLogin);
router.route('/signup').post(postSignup);
router.route('/communities').get(getCommunities);
router.route('/community').get(getCommunity);
router.route('/community/create').post(createCommunity);
router.route('/community/recent').get(getRecentCommunities);
router.route('/community/feed').get(getFeedPosts).post(postFeedPost);
router.route('/community/home').get(getHomePosts).post(postHomePost);
router.route('/community/banner').patch(updateBanner);
router.route('/chat/private').get(getPrivateMessages).post(postPrivateMessage);
router.route('/chat/private/room').get(getChatRoomPrivate);
router.route('/chat/community').get(getCommunityMessages).post(postCommunityMessage);
router.route('/chat/contact').get(getContacts).post(postContact);
router.route('/profile').get(getProfile);
router.route('/user').get(getUsername);
router.route('/member').get(getMember).post(setMember).delete(deleteMember);
router.route('/admin').get(getAdmin).post(setAdmin).delete(deleteAdmin);
router.route('/banner').patch(updateBanner);
router.route('/search').get(getSearch);
router.route('/follow').get(getFollow).post(setFollow).delete(deleteFollow);
router.route('/test').get(testing).post(testing);

module.exports = router;
