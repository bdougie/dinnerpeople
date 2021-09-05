import 'index.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

class FFChatPage extends StatefulWidget {
  FFChatPage({
    Key key,
    @required this.chatInfo,
    this.allowImages = false,
    // Theme settings
    this.backgroundColor,
    this.timeDisplaySetting,
    this.currentUserBoxDecoration,
    this.otherUserBoxDecoration,
    this.currentUserTextStyle,
    this.otherUserTextStyle,
    this.inputHintTextStyle,
    this.inputTextStyle,
  }) : super(key: key);

  final FFChatInfo chatInfo;
  final bool allowImages;

  final Color backgroundColor;
  final TimeDisplaySetting timeDisplaySetting;
  final BoxDecoration currentUserBoxDecoration;
  final BoxDecoration otherUserBoxDecoration;
  final TextStyle currentUserTextStyle;
  final TextStyle otherUserTextStyle;
  final TextStyle inputHintTextStyle;
  final TextStyle inputTextStyle;

  @override
  _FFChatPageState createState() => _FFChatPageState();
}

class _FFChatPageState extends State<FFChatPage> {
  final scrollController = ScrollController();
  final focusNode = FocusNode();

  DocumentReference get chatReference => widget.chatInfo.chatReference;
  DocumentReference get currentUserRef => widget.chatInfo.currentUserReference;
  ChatUser get currentUser => widget.chatInfo.currentUser;
  ChatUser get otherUser => widget.chatInfo.otherUser;

  Map<String, ChatMessagesRecord> allMessages = {};
  List<ChatMessagesRecord> messages = [];
  StreamSubscription<List<ChatMessagesRecord>> messagesStream;
  bool _initialized = false;

  DateTime latestMessageTime() =>
      messages.isNotEmpty ? messages.last.timestamp : null;

  Future updateSeenBy() => chatReference.update({
        'last_message_seen_by': FieldValue.arrayUnion([currentUserRef])
      });

  void onNewMessage(DateTime lastBefore, DateTime lastAfter) {
    if (!mounted ||
        !_initialized ||
        lastAfter == null ||
        (lastBefore?.isAtSameMomentAs(lastAfter) ?? false)) {
      return;
    }
    SchedulerBinding.instance.addPostFrameCallback((_) async {
      Future.delayed(Duration(milliseconds: 100))
          .then((_) => scrollController.jumpTo(0));
      updateSeenBy();
    });
  }

  void updateMessages(List<ChatMessagesRecord> chatMessages) {
    final oldLatestTime = latestMessageTime();
    chatMessages.forEach((m) => allMessages[m.reference.id] = m);
    messages = allMessages.values.toList();
    messages.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    onNewMessage(oldLatestTime, latestMessageTime());
    setState(() {});
  }

  StreamSubscription<List<ChatMessagesRecord>> getMessagesStream(
          DocumentReference chatReference) =>
      FFChatManager.instance.getChatMessages(chatReference).listen((m) {
        if (mounted) {
          updateMessages(m);
          FFChatManager.instance.setLatestMessages(chatReference, messages);
        }
      });

  @override
  void initState() {
    super.initState();
    updateMessages(FFChatManager.instance.getLatestMessages(chatReference));
    messagesStream = getMessagesStream(chatReference);
    SchedulerBinding.instance.addPostFrameCallback((_) {
      updateSeenBy();
      setState(() => _initialized = true);
    });
  }

  Future sendMessage({String text, String imageUrl}) async {
    if (chatReference == null) {
      return;
    }
    final chatMessagesRecordData = createChatMessagesRecordData(
      user: currentUserRef,
      chat: chatReference,
      text: text,
      image: imageUrl,
      timestamp: getCurrentTimestamp,
    );
    await ChatMessagesRecord.collection.doc().set(chatMessagesRecordData);
    final lastMessage = (text ?? '').isNotEmpty
        ? text
        : (imageUrl ?? '').isNotEmpty
            ? 'Sent an image'
            : '';
    final lastMessageTime = getCurrentTimestamp;
    final chatsRecordData = createChatsRecordData(
      lastMessage: lastMessage,
      lastMessageTime: lastMessageTime,
    );
    await chatReference.update({
      'last_message_seen_by': [currentUserRef],
      ...chatsRecordData,
    });
  }

  @override
  void dispose() {
    messagesStream?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
        children: [
          FFChatWidget(
            currentUser: currentUser,
            scrollController: scrollController,
            focusNode: focusNode,
            messages: messages
                .map(
                  (message) => ChatMessage(
                    id: message.reference.id,
                    user: message.user.id == currentUser.uid
                        ? currentUser
                        : otherUser,
                    text: message.text,
                    image: message.image,
                    createdAt: message.timestamp,
                  ),
                )
                .toList(),
            onSend: (message) =>
                sendMessage(text: message.text, imageUrl: message.image),
            uploadMediaAction: () async {
              final selectedMedia = await selectMedia();
              if (selectedMedia == null ||
                  !validateFileFormat(selectedMedia.storagePath, context)) {
                return;
              }
              showUploadMessage(context, 'Sending photo...', showLoading: true);
              final downloadUrl = await uploadData(
                  selectedMedia.storagePath, selectedMedia.bytes);
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
              await sendMessage(imageUrl: downloadUrl);
            },
            backgroundColor: widget.backgroundColor,
            timeDisplaySetting: widget.timeDisplaySetting,
            currentUserBoxDecoration: widget.currentUserBoxDecoration,
            otherUserBoxDecoration: widget.otherUserBoxDecoration,
            currentUserTextStyle: widget.currentUserTextStyle,
            otherUserTextStyle: widget.otherUserTextStyle,
            inputHintTextStyle: widget.inputHintTextStyle,
            inputTextStyle: widget.inputTextStyle,
          ),
        ],
      );
}
