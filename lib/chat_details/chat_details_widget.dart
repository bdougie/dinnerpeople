import '../backend/backend.dart';
import '../flutter_flow/chat/index.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../main.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ChatDetailsWidget extends StatefulWidget {
  ChatDetailsWidget({
    Key key,
    this.chatUser,
  }) : super(key: key);

  final UsersRecord chatUser;

  @override
  _ChatDetailsWidgetState createState() => _ChatDetailsWidgetState();
}

class _ChatDetailsWidgetState extends State<ChatDetailsWidget> {
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: scaffoldKey,
      appBar: AppBar(
        backgroundColor: FlutterFlowTheme.primaryColor,
        automaticallyImplyLeading: false,
        leading: InkWell(
          onTap: () async {
            await Navigator.push(
              context,
              PageTransition(
                type: PageTransitionType.leftToRight,
                duration: Duration(milliseconds: 200),
                reverseDuration: Duration(milliseconds: 200),
                child: NavBarPage(initialPage: 'chatMain'),
              ),
            );
          },
          child: Icon(
            Icons.arrow_back_rounded,
            color: FlutterFlowTheme.tertiaryColor,
            size: 24,
          ),
        ),
        title: Text(
          widget.chatUser.displayName,
          style: FlutterFlowTheme.subtitle2.override(
            fontFamily: 'Lexend Deca',
          ),
        ),
        actions: [
          Padding(
            padding: EdgeInsets.fromLTRB(0, 0, 16, 0),
            child: InkWell(
              onTap: () async {
                scaffoldKey.currentState.openEndDrawer();
              },
              child: Icon(
                Icons.more_vert,
                color: FlutterFlowTheme.tertiaryColor,
                size: 24,
              ),
            ),
          )
        ],
        centerTitle: true,
        elevation: 3,
      ),
      backgroundColor: FlutterFlowTheme.background,
      endDrawer: Drawer(
        elevation: 16,
        child: Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            color: FlutterFlowTheme.dark900,
          ),
          child: StreamBuilder<UsersRecord>(
            stream: UsersRecord.getDocument(widget.chatUser.reference),
            builder: (context, snapshot) {
              // Customize what your widget looks like when it's loading.
              if (!snapshot.hasData) {
                return Center(
                  child: SizedBox(
                    width: 50,
                    height: 50,
                    child: CircularProgressIndicator(
                      color: FlutterFlowTheme.primaryColor,
                    ),
                  ),
                );
              }
              final columnUsersRecord = snapshot.data;
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      Padding(
                        padding: EdgeInsets.fromLTRB(12, 36, 0, 0),
                        child: IconButton(
                          onPressed: () async {
                            if (scaffoldKey.currentState.isDrawerOpen ||
                                scaffoldKey.currentState.isEndDrawerOpen) {
                              Navigator.pop(context);
                            }
                          },
                          icon: Icon(
                            Icons.close_rounded,
                            color: FlutterFlowTheme.grayIcon,
                            size: 30,
                          ),
                          iconSize: 30,
                        ),
                      )
                    ],
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(0, 10, 0, 20),
                    child: Row(
                      mainAxisSize: MainAxisSize.max,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Card(
                          clipBehavior: Clip.antiAliasWithSaveLayer,
                          color: FlutterFlowTheme.primaryColor,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(60),
                          ),
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(2, 2, 2, 2),
                            child: Container(
                              width: 90,
                              height: 90,
                              clipBehavior: Clip.antiAlias,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                              ),
                              child: CachedNetworkImage(
                                imageUrl: valueOrDefault<String>(
                                  columnUsersRecord.photoUrl,
                                  'https://image.flaticon.com/icons/png/512/2922/2922510.png',
                                ),
                              ),
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.max,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        columnUsersRecord.displayName,
                        textAlign: TextAlign.center,
                        style: FlutterFlowTheme.title3.override(
                          fontFamily: 'Lexend Deca',
                          color: FlutterFlowTheme.tertiaryColor,
                        ),
                      )
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.max,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Padding(
                        padding: EdgeInsets.fromLTRB(0, 8, 0, 0),
                        child: Text(
                          columnUsersRecord.email,
                          style: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                            color: FlutterFlowTheme.primaryColor,
                          ),
                        ),
                      )
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(20, 24, 16, 0),
                          child: Column(
                            mainAxisSize: MainAxisSize.max,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Job Title',
                                style: FlutterFlowTheme.bodyText1.override(
                                  fontFamily: 'Lexend Deca',
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.fromLTRB(0, 8, 0, 0),
                                child: Text(
                                  columnUsersRecord.userRole,
                                  style: FlutterFlowTheme.subtitle2.override(
                                    fontFamily: 'Lexend Deca',
                                  ),
                                ),
                              )
                            ],
                          ),
                        ),
                      )
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(20, 16, 16, 0),
                          child: Column(
                            mainAxisSize: MainAxisSize.max,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Employed Since',
                                style: FlutterFlowTheme.bodyText1.override(
                                  fontFamily: 'Lexend Deca',
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.fromLTRB(0, 8, 0, 0),
                                child: Text(
                                  dateTimeFormat(
                                      'MMMEd', columnUsersRecord.createdTime),
                                  style: FlutterFlowTheme.subtitle2.override(
                                    fontFamily: 'Lexend Deca',
                                  ),
                                ),
                              )
                            ],
                          ),
                        ),
                      )
                    ],
                  )
                ],
              );
            },
          ),
        ),
      ),
      body: SafeArea(
        child: FutureBuilder<FFChatInfo>(
          future: FFChatManager.instance.getChatInfo(
            currentUserReference,
            widget.chatUser.reference,
            ChatUser(
              uid: widget.chatUser.reference.id,
              avatar: widget.chatUser.photoUrl,
            ),
          ),
          builder: (context, snapshot) => snapshot.hasData
              ? FFChatPage(
                  chatInfo: snapshot.data,
                  allowImages: true,
                  backgroundColor: FlutterFlowTheme.background,
                  timeDisplaySetting: TimeDisplaySetting.visibleOnTap,
                  currentUserBoxDecoration: BoxDecoration(
                    color: FlutterFlowTheme.dark900,
                    border: Border.all(
                      color: Colors.transparent,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  otherUserBoxDecoration: BoxDecoration(
                    color: Color(0xFF4B39EF),
                    border: Border.all(
                      color: Colors.transparent,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  currentUserTextStyle: GoogleFonts.getFont(
                    'Lexend Deca',
                    color: FlutterFlowTheme.tertiaryColor,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                    fontStyle: FontStyle.normal,
                  ),
                  otherUserTextStyle: GoogleFonts.getFont(
                    'Lexend Deca',
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                  inputHintTextStyle: GoogleFonts.getFont(
                    'DM Sans',
                    color: Color(0xFF95A1AC),
                    fontWeight: FontWeight.normal,
                    fontSize: 14,
                  ),
                  inputTextStyle: GoogleFonts.getFont(
                    'DM Sans',
                    color: Colors.black,
                    fontWeight: FontWeight.normal,
                    fontSize: 14,
                  ),
                )
              : const Center(
                  child: SizedBox(
                    width: 50,
                    height: 50,
                    child: CircularProgressIndicator(
                      color: FlutterFlowTheme.primaryColor,
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}
