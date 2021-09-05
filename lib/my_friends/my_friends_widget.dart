import '../backend/backend.dart';
import '../chat_details/chat_details_widget.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class MyFriendsWidget extends StatefulWidget {
  MyFriendsWidget({Key key}) : super(key: key);

  @override
  _MyFriendsWidgetState createState() => _MyFriendsWidgetState();
}

class _MyFriendsWidgetState extends State<MyFriendsWidget> {
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: scaffoldKey,
      appBar: AppBar(
        backgroundColor: FlutterFlowTheme.primaryColor,
        automaticallyImplyLeading: false,
        title: Text(
          'My Team',
          style: FlutterFlowTheme.title1.override(
            fontFamily: 'Lexend Deca',
          ),
        ),
        actions: [
          Padding(
            padding: EdgeInsets.fromLTRB(0, 0, 16, 0),
            child: IconButton(
              onPressed: () async {
                Navigator.pop(context);
              },
              icon: Icon(
                Icons.close_rounded,
                color: FlutterFlowTheme.tertiaryColor,
                size: 30,
              ),
              iconSize: 30,
            ),
          )
        ],
        centerTitle: false,
        elevation: 2,
      ),
      backgroundColor: FlutterFlowTheme.background,
      body: StreamBuilder<List<UsersRecord>>(
        stream: queryUsersRecord(
          queryBuilder: (usersRecord) => usersRecord.orderBy('display_name'),
        ),
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
          List<UsersRecord> columnUsersRecordList = snapshot.data;
          if (columnUsersRecordList.isEmpty) {
            return Center(
              child: Image.asset(
                'assets/images/noFriends@2x.png',
                width: MediaQuery.of(context).size.width * 0.9,
              ),
            );
          }
          return Column(
            mainAxisSize: MainAxisSize.max,
            children:
                List.generate(columnUsersRecordList.length, (columnIndex) {
              final columnUsersRecord = columnUsersRecordList[columnIndex];
              return Padding(
                padding: EdgeInsets.fromLTRB(0, 12, 0, 0),
                child: Row(
                  mainAxisSize: MainAxisSize.max,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Padding(
                      padding: EdgeInsets.fromLTRB(8, 0, 8, 0),
                      child: Material(
                        color: Colors.transparent,
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Container(
                          width: MediaQuery.of(context).size.width * 0.96,
                          height: 70,
                          decoration: BoxDecoration(
                            color: FlutterFlowTheme.dark900,
                            boxShadow: [
                              BoxShadow(
                                color: FlutterFlowTheme.dark900,
                                offset: Offset(0, 1),
                              )
                            ],
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Colors.transparent,
                              width: 0,
                            ),
                          ),
                          child: InkWell(
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChatDetailsWidget(
                                    chatUser: columnUsersRecord,
                                  ),
                                ),
                              );
                            },
                            child: Row(
                              mainAxisSize: MainAxisSize.max,
                              children: [
                                Padding(
                                  padding: EdgeInsets.fromLTRB(12, 0, 12, 0),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.max,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Card(
                                        clipBehavior:
                                            Clip.antiAliasWithSaveLayer,
                                        color: FlutterFlowTheme.primaryColor,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(50),
                                        ),
                                        child: Padding(
                                          padding:
                                              EdgeInsets.fromLTRB(2, 2, 2, 2),
                                          child: Container(
                                            width: 50,
                                            height: 50,
                                            clipBehavior: Clip.antiAlias,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                            ),
                                            child: CachedNetworkImage(
                                              imageUrl: valueOrDefault<String>(
                                                columnUsersRecord.photoUrl,
                                                'https://image.flaticon.com/icons/png/512/3135/3135715.png',
                                              ),
                                            ),
                                          ),
                                        ),
                                      )
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.max,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Row(
                                        mainAxisSize: MainAxisSize.max,
                                        children: [
                                          Text(
                                            columnUsersRecord.displayName,
                                            style: FlutterFlowTheme.subtitle1
                                                .override(
                                              fontFamily: 'Lexend Deca',
                                              color: FlutterFlowTheme
                                                  .tertiaryColor,
                                            ),
                                          )
                                        ],
                                      ),
                                      Row(
                                        mainAxisSize: MainAxisSize.max,
                                        children: [
                                          Expanded(
                                            child: Padding(
                                              padding: EdgeInsets.fromLTRB(
                                                  0, 4, 4, 0),
                                              child: Text(
                                                columnUsersRecord.email,
                                                style: FlutterFlowTheme
                                                    .bodyText2
                                                    .override(
                                                  fontFamily: 'Lexend Deca',
                                                  color: FlutterFlowTheme
                                                      .primaryColor,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ),
                                          )
                                        ],
                                      )
                                    ],
                                  ),
                                ),
                                Padding(
                                  padding: EdgeInsets.fromLTRB(0, 0, 8, 0),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.max,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.chevron_right_rounded,
                                        color: Color(0xFF82878C),
                                        size: 24,
                                      )
                                    ],
                                  ),
                                )
                              ],
                            ),
                          ),
                        ),
                      ),
                    )
                  ],
                ),
              );
            }),
          );
        },
      ),
    );
  }
}
