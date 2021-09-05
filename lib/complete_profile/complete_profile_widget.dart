import '../auth/auth_util.dart';
import '../backend/backend.dart';
import '../backend/firebase_storage/storage.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../flutter_flow/flutter_flow_widgets.dart';
import '../flutter_flow/upload_media.dart';
import '../main.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class CompleteProfileWidget extends StatefulWidget {
  CompleteProfileWidget({Key key}) : super(key: key);

  @override
  _CompleteProfileWidgetState createState() => _CompleteProfileWidgetState();
}

class _CompleteProfileWidgetState extends State<CompleteProfileWidget> {
  String uploadedFileUrl = '';
  TextEditingController imageURLController;
  TextEditingController displayNameController;
  TextEditingController yourTitleController;
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    displayNameController = TextEditingController();
    imageURLController = TextEditingController();
    yourTitleController = TextEditingController();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: scaffoldKey,
      appBar: AppBar(
        backgroundColor: FlutterFlowTheme.dark900,
        automaticallyImplyLeading: false,
        title: Text(
          'Complete Profile',
          style: FlutterFlowTheme.title2.override(
            fontFamily: 'Lexend Deca',
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [],
        centerTitle: false,
        elevation: 0,
      ),
      backgroundColor: FlutterFlowTheme.dark900,
      body: Container(
        width: MediaQuery.of(context).size.width,
        height: MediaQuery.of(context).size.height * 1,
        decoration: BoxDecoration(
          color: FlutterFlowTheme.dark900,
          image: DecorationImage(
            fit: BoxFit.fitWidth,
            image: Image.asset(
              'assets/images/launchScreen@3x.png',
            ).image,
          ),
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
                      showUploadMessage(context, 'Uploading file...',
                          showLoading: true);
                      final downloadUrl = await uploadData(
                          selectedMedia.storagePath, selectedMedia.bytes);
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      if (downloadUrl != null) {
                        setState(() => uploadedFileUrl = downloadUrl);
                        showUploadMessage(context, 'Success!');
                      } else {
                        showUploadMessage(context, 'Failed to upload media');
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
                    child: Image.asset(
                      'assets/images/uiAvatar@2x.png',
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: TextFormField(
                controller: imageURLController,
                obscureText: false,
                decoration: InputDecoration(
                  labelText: 'Image URL',
                  labelStyle: FlutterFlowTheme.bodyText1.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0x98FFFFFF),
                    fontSize: 14,
                    fontWeight: FontWeight.normal,
                  ),
                  hintText: 'Copy an avatar here...',
                  hintStyle: FlutterFlowTheme.bodyText1.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0x98FFFFFF),
                    fontSize: 14,
                    fontWeight: FontWeight.normal,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  filled: true,
                  fillColor: FlutterFlowTheme.background,
                  contentPadding: EdgeInsets.fromLTRB(20, 24, 20, 24),
                ),
                style: FlutterFlowTheme.bodyText1.override(
                  fontFamily: 'Lexend Deca',
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                ),
                keyboardType: TextInputType.url,
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: TextFormField(
                controller: displayNameController,
                obscureText: false,
                decoration: InputDecoration(
                  labelText: 'Your Name',
                  labelStyle: FlutterFlowTheme.bodyText1.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0x98FFFFFF),
                    fontSize: 14,
                    fontWeight: FontWeight.normal,
                  ),
                  hintText: 'What name do you go by?',
                  hintStyle: FlutterFlowTheme.bodyText1.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0x98FFFFFF),
                    fontSize: 14,
                    fontWeight: FontWeight.normal,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  filled: true,
                  fillColor: FlutterFlowTheme.background,
                  contentPadding: EdgeInsets.fromLTRB(20, 24, 20, 24),
                ),
                style: FlutterFlowTheme.bodyText1.override(
                  fontFamily: 'Lexend Deca',
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                ),
                keyboardType: TextInputType.name,
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: TextFormField(
                controller: yourTitleController,
                obscureText: false,
                decoration: InputDecoration(
                  labelText: 'Your Title',
                  labelStyle: FlutterFlowTheme.bodyText1.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0x98FFFFFF),
                    fontSize: 14,
                    fontWeight: FontWeight.normal,
                  ),
                  hintText: 'What do you do?',
                  hintStyle: FlutterFlowTheme.bodyText1.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0x98FFFFFF),
                    fontSize: 14,
                    fontWeight: FontWeight.normal,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1,
                    ),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  filled: true,
                  fillColor: FlutterFlowTheme.background,
                  contentPadding: EdgeInsets.fromLTRB(20, 24, 20, 24),
                ),
                style: FlutterFlowTheme.bodyText1.override(
                  fontFamily: 'Lexend Deca',
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                ),
                keyboardType: TextInputType.emailAddress,
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(0, 24, 0, 0),
              child: FFButtonWidget(
                onPressed: () async {
                  final usersUpdateData = createUsersRecordData(
                    photoUrl: valueOrDefault<String>(
                      imageURLController.text,
                      'https://image.flaticon.com/icons/png/512/3135/3135715.png',
                    ),
                    displayName: displayNameController.text,
                    userRole: yourTitleController.text,
                  );
                  await currentUserReference.update(usersUpdateData);
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => NavBarPage(initialPage: 'chatMain'),
                    ),
                  );
                },
                text: 'Save Profile',
                options: FFButtonOptions(
                  width: 230,
                  height: 60,
                  color: Colors.white,
                  textStyle: FlutterFlowTheme.subtitle2.override(
                    fontFamily: 'Lexend Deca',
                    color: Color(0xFF4B39EF),
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
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
    );
  }
}
