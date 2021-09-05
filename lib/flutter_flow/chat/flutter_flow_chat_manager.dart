import 'index.dart';

const kMaxChatCacheSize = 5;

class FFChatInfo {
  const FFChatInfo(this.chatReference, this.currentUserReference,
      this.currentUser, this.otherUser);
  final DocumentReference chatReference;
  final DocumentReference currentUserReference;
  final ChatUser currentUser;
  final ChatUser otherUser;
}

class FFChatManager {
  FFChatManager._();

  // Cache that will ensure chat queries are kept alive. By default we only keep
  // at most 5 chat streams in the cache.
  static Map<String, Stream<List<ChatMessagesRecord>>> _chatMessages = {};
  static Map<String, List<ChatMessagesRecord>> _chatMessagesCache = {};
  // Keep a map from user uid to the respective chat document reference.
  static Map<String, DocumentReference> _userChats = {};

  static FFChatManager _instance;
  static FFChatManager get instance => _instance ??= FFChatManager._();

  Stream<List<ChatMessagesRecord>> getChatMessages(
      DocumentReference chatReference) {
    final chatId = chatReference.id;
    if (!_chatMessages.containsKey(chatId) &&
        _chatMessages.length >= kMaxChatCacheSize) {
      _chatMessages.remove(_chatMessages.keys.first);
      _chatMessagesCache.remove(_chatMessages.keys.first);
    }
    _chatMessages[chatId] ??= queryChatMessagesRecord(
      queryBuilder: (q) => q.where('chat', isEqualTo: chatReference).orderBy(
            'timestamp',
            descending: true,
          ),
      limit: 30,
    );
    return _chatMessages[chatId];
  }

  void setLatestMessages(
          DocumentReference chatReference, List<ChatMessagesRecord> messages) =>
      _chatMessagesCache[chatReference.id] = messages;

  List<ChatMessagesRecord> getLatestMessages(DocumentReference chatReference) =>
      _chatMessagesCache[chatReference.id] ?? [];

  DocumentReference getChatUserRef(
      DocumentReference currentUserRef, ChatsRecord chat) {
    final userRef = chat.users.firstWhere((d) => d.path != currentUserRef.path);
    _userChats[userRef.id] = chat.reference;
    return userRef;
  }

  Future<FFChatInfo> getChatInfo(
    DocumentReference currentUserRef,
    DocumentReference otherUserRef,
    ChatUser otherUser,
  ) async {
    final currentUser = ChatUser(uid: currentUserRef.id);
    final chatReference = await getChatReference(currentUserRef, otherUserRef);
    return FFChatInfo(chatReference, currentUserRef, currentUser, otherUser);
  }

  Future<DocumentReference> getChatReference(
    DocumentReference currentUser,
    DocumentReference otherUser,
  ) async {
    _userChats.clear();
    var chatRef = _userChats[otherUser.id];
    if (chatRef != null) {
      return chatRef;
    }

    // Determine who is userA and userB deterministically by uid.
    final users = [otherUser, currentUser];
    users.sort((a, b) => a.id.compareTo(b.id));

    var chat = await queryChatsRecord(
            queryBuilder: (q) => q
                .where('user_a', isEqualTo: users.first)
                .where('user_b', isEqualTo: users.last)
                .where('users', arrayContains: currentUser),
            singleRecord: true)
        .first;
    // If chat already exists, cache and return it.
    if (chat.isNotEmpty) {
      _userChats[otherUser.id] = chat.first.reference;
      return chat.first.reference;
    }
    // Otherwise, create a chat between these two users.
    chatRef = ChatsRecord.collection.doc();
    await chatRef.set({
      ...createChatsRecordData(
        userA: users.first,
        userB: users.last,
      ),
      'users': users,
    });
    return chatRef;
  }
}
