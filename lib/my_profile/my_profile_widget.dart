import '../auth/auth_util.dart';
import '../backend/backend.dart';
import '../backend/firebase_storage/storage.dart';
import '../change_password/change_password_widget.dart';
import '../edit_profile/edit_profile_widget.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../flutter_flow/flutter_flow_widgets.dart';
import '../flutter_flow/upload_media.dart';
import '../login/login_widget.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class MyProfileWidget extends StatefulWidget {
  MyProfileWidget({Key key}) : super(key: key);

  @override
  _MyProfileWidgetState createState() => _MyProfileWidgetState();
}

class _MyProfileWidgetState extends State<MyProfileWidget> {
  String uploadedFileUrl = '';
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<UsersRecord>(
      stream: UsersRecord.getDocument(currentUserReference),
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
        final myProfileUsersRecord = snapshot.data;
        return Scaffold(
          key: scaffoldKey,
          backgroundColor: FlutterFlowTheme.background,
          body: Column(
            mainAxisSize: MainAxisSize.max,
            children: [
              Row(
                mainAxisSize: MainAxisSize.max,
                children: [
                  Container(
                    width: MediaQuery.of(context).size.width,
                    height: 350,
                    decoration: BoxDecoration(
                      color: FlutterFlowTheme.primaryColor,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.max,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.max,
                          children: [
                            Expanded(
                              child: Stack(
                                children: [
                                  Align(
                                    alignment: Alignment(0, 0),
                                    child: Image.asset(
                                      'assets/images/hero@2x.png',
                                      width: MediaQuery.of(context).size.width,
                                      height: 200,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  Align(
                                    alignment: Alignment(0, 0),
                                    child: Padding(
                                      padding:
                                          EdgeInsets.fromLTRB(0, 160, 0, 0),
                                      child: InkWell(
                                        onTap: () async {
                                          final selectedMedia =
                                              await selectMedia(
                                            maxWidth: 1000.00,
                                            maxHeight: 1000.00,
                                          );
                                          if (selectedMedia != null &&
                                              validateFileFormat(
                                                  selectedMedia.storagePath,
                                                  context)) {
                                            showUploadMessage(
                                                context, 'Uploading file...',
                                                showLoading: true);
                                            final downloadUrl =
                                                await uploadData(
                                                    selectedMedia.storagePath,
                                                    selectedMedia.bytes);
                                            ScaffoldMessenger.of(context)
                                                .hideCurrentSnackBar();
                                            if (downloadUrl != null) {
                                              setState(() => uploadedFileUrl =
                                                  downloadUrl);
                                              showUploadMessage(
                                                  context, 'Success!');
                                            } else {
                                              showUploadMessage(context,
                                                  'Failed to upload media');
                                              return;
                                            }
                                          }
                                        },
                                        child: Container(
                                          width: 80,
                                          height: 80,
                                          clipBehavior: Clip.antiAlias,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                          ),
                                          child: CachedNetworkImage(
                                            imageUrl: valueOrDefault<String>(
                                              myProfileUsersRecord.photoUrl,
                                              'https://image.flaticon.com/icons/png/512/599/599305.png',
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  )
                                ],
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
                                myProfileUsersRecord.displayName,
                                style: FlutterFlowTheme.title1.override(
                                  fontFamily: 'Lexend Deca',
                                  color: Colors.white,
                                ),
                              ),
                            )
                          ],
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.max,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Padding(
                              padding: EdgeInsets.fromLTRB(0, 4, 0, 0),
                              child: Text(
                                myProfileUsersRecord.userRole,
                                style: FlutterFlowTheme.bodyText1.override(
                                  fontFamily: 'Lexend Deca',
                                  color: FlutterFlowTheme.grayIcon,
                                ),
                              ),
                            )
                          ],
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(0, 4, 0, 0),
                          child: Text(
                            myProfileUsersRecord.email,
                            style: FlutterFlowTheme.bodyText1.override(
                              fontFamily: 'Lexend Deca',
                              color: FlutterFlowTheme.secondaryColor,
                            ),
                          ),
                        )
                      ],
                    ),
                  )
                ],
              ),
              Column(
                mainAxisSize: MainAxisSize.max,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      Padding(
                        padding: EdgeInsets.fromLTRB(24, 16, 0, 16),
                        child: Text(
                          'Account Settings',
                          style: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    ],
                  )
                ],
              ),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  scrollDirection: Axis.vertical,
                  children: [
                    Padding(
                      padding: EdgeInsets.fromLTRB(0, 1, 0, 0),
                      child: Row(
                        mainAxisSize: MainAxisSize.max,
                        children: [
                          Container(
                            width: MediaQuery.of(context).size.width,
                            height: 60,
                            decoration: BoxDecoration(
                              color: FlutterFlowTheme.background,
                              boxShadow: [
                                BoxShadow(
                                  color: FlutterFlowTheme.dark900,
                                  offset: Offset(0, 1),
                                )
                              ],
                              shape: BoxShape.rectangle,
                            ),
                            child: InkWell(
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => EditProfileWidget(
                                      userEmail: myProfileUsersRecord,
                                      userDisplay: myProfileUsersRecord,
                                      userPhoto: myProfileUsersRecord.reference,
                                    ),
                                  ),
                                );
                              },
                              child: Row(
                                mainAxisSize: MainAxisSize.max,
                                children: [
                                  Padding(
                                    padding: EdgeInsets.fromLTRB(24, 0, 0, 0),
                                    child: Text(
                                      'Edit Profile',
                                      style:
                                          FlutterFlowTheme.subtitle2.override(
                                        fontFamily: 'Lexend Deca',
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Align(
                                      alignment: Alignment(0.9, 0),
                                      child: Icon(
                                        Icons.arrow_forward_ios,
                                        color: Color(0xFF95A1AC),
                                        size: 18,
                                      ),
                                    ),
                                  )
                                ],
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(0, 1, 0, 0),
                      child: Row(
                        mainAxisSize: MainAxisSize.max,
                        children: [
                          Container(
                            width: MediaQuery.of(context).size.width,
                            height: 60,
                            decoration: BoxDecoration(
                              color: FlutterFlowTheme.background,
                              boxShadow: [
                                BoxShadow(
                                  color: FlutterFlowTheme.background,
                                  offset: Offset(0, 1),
                                )
                              ],
                              shape: BoxShape.rectangle,
                            ),
                            child: InkWell(
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        ChangePasswordWidget(),
                                  ),
                                );
                              },
                              child: Row(
                                mainAxisSize: MainAxisSize.max,
                                children: [
                                  Padding(
                                    padding: EdgeInsets.fromLTRB(24, 0, 0, 0),
                                    child: Text(
                                      'Change Password',
                                      style:
                                          FlutterFlowTheme.subtitle2.override(
                                        fontFamily: 'Lexend Deca',
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Align(
                                      alignment: Alignment(0.9, 0),
                                      child: Icon(
                                        Icons.arrow_forward_ios,
                                        color: Color(0xFF95A1AC),
                                        size: 18,
                                      ),
                                    ),
                                  )
                                ],
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(0, 20, 0, 0),
                      child: Row(
                        mainAxisSize: MainAxisSize.max,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          FFButtonWidget(
                            onPressed: () async {
                              await signOut();
                              await Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => LoginWidget(),
                                ),
                                (r) => false,
                              );
                            },
                            text: 'Log Out',
                            options: FFButtonOptions(
                              width: 90,
                              height: 40,
                              color: Colors.white,
                              textStyle: FlutterFlowTheme.bodyText2.override(
                                fontFamily: 'Lexend Deca',
                                color: FlutterFlowTheme.primaryColor,
                              ),
                              elevation: 3,
                              borderSide: BorderSide(
                                color: Colors.transparent,
                                width: 1,
                              ),
                              borderRadius: 30,
                            ),
                          )
                        ],
                      ),
                    )
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }
}
