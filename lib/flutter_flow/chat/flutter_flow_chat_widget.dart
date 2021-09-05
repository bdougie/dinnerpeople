import 'index.dart';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:timeago/timeago.dart' as timeago;

enum TimeDisplaySetting {
  alwaysVisible,
  alwaysInvisible,
  visibleOnTap,
}

class FFChatWidget extends StatelessWidget {
  const FFChatWidget({
    Key key,
    @required this.currentUser,
    @required this.scrollController,
    @required this.focusNode,
    @required this.messages,
    @required this.onSend,
    this.uploadMediaAction,
    // Theme settings
    this.backgroundColor,
    this.timeDisplaySetting = TimeDisplaySetting.visibleOnTap,
    this.currentUserBoxDecoration,
    this.otherUserBoxDecoration,
    this.currentUserTextStyle,
    this.otherUserTextStyle,
    this.inputHintTextStyle,
    this.inputTextStyle,
  }) : super(key: key);

  final ChatUser currentUser;
  final ScrollController scrollController;
  final FocusNode focusNode;
  final List<ChatMessage> messages;
  final Function(ChatMessage) onSend;
  final Function() uploadMediaAction;

  final Color backgroundColor;
  final TimeDisplaySetting timeDisplaySetting;
  final BoxDecoration currentUserBoxDecoration;
  final BoxDecoration otherUserBoxDecoration;
  final TextStyle currentUserTextStyle;
  final TextStyle otherUserTextStyle;
  final TextStyle inputHintTextStyle;
  final TextStyle inputTextStyle;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: focusNode.unfocus,
        child: Container(
          color: backgroundColor,
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12.0),
                child: DashChat(
                  scrollController: scrollController,
                  focusNode: focusNode,
                  shouldShowLoadEarlier: false,
                  scrollToBottom: false,
                  inverted: true,
                  inputMaxLines: 10,
                  user: currentUser,
                  messages: messages.reversed.toList(),
                  onLoadEarlier: () => {},
                  onSend: onSend,
                  leading: const [SizedBox(width: 10.0)],
                  trailing: [
                    if (uploadMediaAction != null)
                      Padding(
                        padding: const EdgeInsets.only(left: 12.0, right: 6.0),
                        child: InkWell(
                          onTap: uploadMediaAction,
                          child: const Icon(
                            Icons.camera_alt_outlined,
                            color: Color(0xA1A1A1A1),
                            size: 24,
                          ),
                        ),
                      ),
                  ],
                  inputDecoration: InputDecoration.collapsed(
                    hintText: 'Type message here',
                    hintStyle: inputHintTextStyle ??
                        GoogleFonts.getFont(
                          'DM Sans',
                          color: const Color(0xFF95A1AC),
                          fontSize: 14,
                        ),
                    fillColor: Colors.white,
                  ),
                  inputTextStyle: inputTextStyle ??
                      GoogleFonts.getFont(
                        'DM Sans',
                        color: Colors.black,
                        fontSize: 14,
                      ),
                  inputToolbarMargin: const EdgeInsets.only(
                    left: 20.0,
                    right: 20.0,
                    top: 10.0,
                  ),
                  messageContainerPadding:
                      const EdgeInsets.fromLTRB(2.0, 2.0, 2.0, 0.0),
                  inputContainerStyle: BoxDecoration(
                    borderRadius: BorderRadius.circular(25),
                    color: Colors.white,
                  ),
                  messageBuilder: (chatMessage) => FFChatMessage(
                    key: Key('ChatMessage_${chatMessage.id}'),
                    chatMessage: chatMessage,
                    timeDisplaySetting: timeDisplaySetting,
                    currentUserBoxDecoration: currentUserBoxDecoration,
                    otherUserBoxDecoration: otherUserBoxDecoration,
                    currentUserTextStyle: currentUserTextStyle,
                    otherUserTextStyle: otherUserTextStyle,
                    isMe: chatMessage.user.uid == currentUser.uid,
                  ),
                ),
              ),
              if (messages.isEmpty)
                Center(
                  child: Text(
                    'Start the conversation...',
                    style: GoogleFonts.getFont(
                      'DM Sans',
                      color: Colors.black,
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
}

class FFChatMessage extends StatefulWidget {
  const FFChatMessage({
    Key key,
    this.chatMessage,
    this.timeDisplaySetting,
    this.currentUserBoxDecoration,
    this.otherUserBoxDecoration,
    this.currentUserTextStyle,
    this.otherUserTextStyle,
    this.isMe,
  }) : super(key: key);

  final ChatMessage chatMessage;
  final TimeDisplaySetting timeDisplaySetting;
  final BoxDecoration currentUserBoxDecoration;
  final BoxDecoration otherUserBoxDecoration;
  final TextStyle currentUserTextStyle;
  final TextStyle otherUserTextStyle;
  final bool isMe;

  @override
  _FFChatMessageState createState() => _FFChatMessageState();
}

class _FFChatMessageState extends State<FFChatMessage> {
  bool _showTime = false;
  bool get showTime {
    switch (widget.timeDisplaySetting) {
      case TimeDisplaySetting.alwaysVisible:
        return true;
      case TimeDisplaySetting.alwaysInvisible:
        return false;
      case TimeDisplaySetting.visibleOnTap:
      default:
        return _showTime;
    }
  }

  BoxDecoration get boxDecoration => ((widget.isMe
                  ? widget.currentUserBoxDecoration
                  : widget.otherUserBoxDecoration) ??
              BoxDecoration(
                borderRadius: BorderRadius.circular(15),
                color: widget.isMe ? Colors.white : const Color(0xFF4B39EF),
              ))
          .copyWith(
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            offset: const Offset(0, 1),
            blurRadius: 3.0,
          ),
        ],
      );

  TextStyle get textStyle => ((widget.isMe
              ? widget.currentUserTextStyle
              : widget.otherUserTextStyle) ??
          GoogleFonts.getFont(
            'DM Sans',
            color: widget.isMe ? const Color(0xFF1E2429) : Colors.white,
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ))
      .copyWith(height: 1.5);

  bool get hasImage => (widget.chatMessage.image ?? '').isNotEmpty;

  @override
  Widget build(BuildContext context) => Align(
        alignment: widget.isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment:
              widget.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 6.0),
            InkWell(
              onTap: () => setState(() => _showTime = !showTime),
              splashColor: Colors.transparent,
              child: Container(
                constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.65),
                decoration: boxDecoration.copyWith(
                    color: hasImage ? Colors.transparent : null),
                child: hasImage
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: CachedNetworkImage(
                          imageUrl: widget.chatMessage.image,
                          fit: BoxFit.fitWidth,
                        ),
                      )
                    : Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 6,
                        ),
                        child: Text(
                          widget.chatMessage.text,
                          style: textStyle,
                        ),
                      ),
              ),
            ),
            if (showTime)
              Padding(
                padding: const EdgeInsets.only(top: 5.0, left: 5.0),
                child: Text(
                  widget.chatMessage.createdAt.isBefore(
                          DateTime.now().subtract(const Duration(minutes: 3)))
                      ? timeago.format(widget.chatMessage.createdAt)
                      : DateFormat.jm().format(widget.chatMessage.createdAt),
                  style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 12,
                  ),
                ),
              ),
            const SizedBox(height: 2.0),
          ],
        ),
      );
}
