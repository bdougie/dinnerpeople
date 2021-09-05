import '../auth/auth_util.dart';
import '../backend/backend.dart';
import '../backend/firebase_storage/storage.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../flutter_flow/flutter_flow_widgets.dart';
import '../flutter_flow/upload_media.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class EditProfileWidget extends StatefulWidget {
  EditProfileWidget({
    Key key,
    this.userEmail,
    this.userDisplay,
    this.userPhoto,
  }) : super(key: key);

  final UsersRecord userEmail;
  final UsersRecord userDisplay;
  final DocumentReference userPhoto;

  @override
  _EditProfileWidgetState createState() => _EditProfileWidgetState();
}

class _EditProfileWidgetState extends State<EditProfileWidget> {
  String uploadedFileUrl = '';
  TextEditingController textController1;
  TextEditingController textController2;
  TextEditingController textController3;
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    textController1 = TextEditingController(text: currentUserEmail);
  }

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
        final editProfileUsersRecord = snapshot.data;
        return Scaffold(
          key: scaffoldKey,
          appBar: AppBar(
            backgroundColor: FlutterFlowTheme.primaryColor,
            automaticallyImplyLeading: false,
            leading: InkWell(
              onTap: () async {
                Navigator.pop(context);
              },
              child: Icon(
                Icons.arrow_back_rounded,
                color: FlutterFlowTheme.tertiaryColor,
                size: 24,
              ),
            ),
            title: Text(
              'Edit Profile',
              style: FlutterFlowTheme.title2.override(
                fontFamily: 'Lexend Deca',
              ),
            ),
            actions: [],
            centerTitle: false,
            elevation: 0,
          ),
          backgroundColor: FlutterFlowTheme.dark900,
          body: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.max,
              children: [
                Material(
                  color: Colors.transparent,
                  elevation: 3,
                  child: Container(
                    width: MediaQuery.of(context).size.width,
                    height: 400,
                    decoration: BoxDecoration(
                      color: FlutterFlowTheme.primaryColor,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.max,
                      children: [
                        Align(
                          alignment: Alignment(0, 0),
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(0, 20, 0, 0),
                            child: InkWell(
                              onTap: () async {
                                final selectedMedia = await selectMedia(
                                  maxWidth: 1000.00,
                                  maxHeight: 1000.00,
                                );
                                if (selectedMedia != null &&
                                    validateFileFormat(
                                        selectedMedia.storagePath, context)) {
                                  showUploadMessage(
                                      context, 'Uploading file...',
                                      showLoading: true);
                                  final downloadUrl = await uploadData(
                                      selectedMedia.storagePath,
                                      selectedMedia.bytes);
                                  ScaffoldMessenger.of(context)
                                      .hideCurrentSnackBar();
                                  if (downloadUrl != null) {
                                    setState(
                                        () => uploadedFileUrl = downloadUrl);
                                    showUploadMessage(context, 'Success!');
                                  } else {
                                    showUploadMessage(
                                        context, 'Failed to upload media');
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
                                child: Image.network(
                                  valueOrDefault<String>(
                                    editProfileUsersRecord.photoUrl,
                                    'https://img-premium.flaticon.com/png/512/4886/premium/4886318.png?token=exp=1629155806~hmac=8593bfc502d7901620d7bf8031966c83',
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.max,
                          children: [
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.fromLTRB(20, 12, 20, 0),
                                child: TextFormField(
                                  controller: textController1,
                                  obscureText: false,
                                  decoration: InputDecoration(
                                    labelText: 'Email Address',
                                    labelStyle:
                                        FlutterFlowTheme.bodyText1.override(
                                      fontFamily: 'Lexend Deca',
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderSide: BorderSide(
                                        color: Color(0x00000000),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderSide: BorderSide(
                                        color: Color(0x00000000),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    filled: true,
                                    fillColor: Color(0xFF3124A1),
                                    contentPadding:
                                        EdgeInsets.fromLTRB(16, 24, 16, 24),
                                  ),
                                  style: FlutterFlowTheme.bodyText1.override(
                                    fontFamily: 'Lexend Deca',
                                    color: FlutterFlowTheme.tertiaryColor,
                                  ),
                                  keyboardType: TextInputType.emailAddress,
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
                                padding: EdgeInsets.fromLTRB(20, 12, 20, 0),
                                child: TextFormField(
                                  controller: textController2 ??=
                                      TextEditingController(
                                    text: editProfileUsersRecord.displayName,
                                  ),
                                  obscureText: false,
                                  decoration: InputDecoration(
                                    labelText: 'Full Name',
                                    labelStyle:
                                        FlutterFlowTheme.bodyText1.override(
                                      fontFamily: 'Lexend Deca',
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderSide: BorderSide(
                                        color: Color(0x00000000),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderSide: BorderSide(
                                        color: Color(0x00000000),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    filled: true,
                                    fillColor: Color(0xFF3124A1),
                                    contentPadding:
                                        EdgeInsets.fromLTRB(16, 24, 16, 24),
                                  ),
                                  style: FlutterFlowTheme.bodyText1.override(
                                    fontFamily: 'Lexend Deca',
                                    color: FlutterFlowTheme.tertiaryColor,
                                  ),
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
                                padding: EdgeInsets.fromLTRB(20, 12, 20, 0),
                                child: TextFormField(
                                  controller: textController3 ??=
                                      TextEditingController(
                                    text: editProfileUsersRecord.userRole,
                                  ),
                                  obscureText: false,
                                  decoration: InputDecoration(
                                    labelText: 'Job Title',
                                    labelStyle:
                                        FlutterFlowTheme.bodyText1.override(
                                      fontFamily: 'Lexend Deca',
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderSide: BorderSide(
                                        color: Color(0x00000000),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderSide: BorderSide(
                                        color: Color(0x00000000),
                                        width: 1,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    filled: true,
                                    fillColor: Color(0xFF3124A1),
                                    contentPadding:
                                        EdgeInsets.fromLTRB(16, 24, 16, 24),
                                  ),
                                  style: FlutterFlowTheme.bodyText1.override(
                                    fontFamily: 'Lexend Deca',
                                    color: FlutterFlowTheme.tertiaryColor,
                                  ),
                                ),
                              ),
                            )
                          ],
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(0, 20, 0, 0),
                          child: FFButtonWidget(
                            onPressed: () async {
                              final usersUpdateData = createUsersRecordData(
                                email: textController1.text,
                                displayName: textController2?.text ?? '',
                                photoUrl: uploadedFileUrl,
                                userRole: textController3?.text ?? '',
                              );
                              await editProfileUsersRecord.reference
                                  .update(usersUpdateData);
                              Navigator.pop(context);
                            },
                            text: 'Save Changes',
                            options: FFButtonOptions(
                              width: 200,
                              height: 50,
                              color: FlutterFlowTheme.tertiaryColor,
                              textStyle: FlutterFlowTheme.subtitle2.override(
                                fontFamily: 'Lexend Deca',
                                color: FlutterFlowTheme.primaryColor,
                                fontWeight: FontWeight.bold,
                              ),
                              elevation: 3,
                              borderSide: BorderSide(
                                color: Colors.transparent,
                                width: 1,
                              ),
                              borderRadius: 40,
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
        );
      },
    );
  }
}
