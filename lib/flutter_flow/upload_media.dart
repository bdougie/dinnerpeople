import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mime_type/mime_type.dart';

import '../auth/auth_util.dart';

const allowedFormats = {'image/png', 'image/jpeg', 'video/mp4', 'image/gif'};

class SelectedMedia {
  const SelectedMedia(this.storagePath, this.bytes);
  final String storagePath;
  final Uint8List bytes;
}

Future<SelectedMedia> selectMediaWithSourceBottomSheet({
  BuildContext context,
  double maxWidth,
  double maxHeight,
  bool isVideo = false,
  String pickerFontFamily = 'Roboto',
  Color textColor = const Color(0xFF111417),
  Color backgroundColor = const Color(0xFFF5F5F5),
}) async {
  final fromCamera = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: backgroundColor,
      builder: (context) {
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(0, 8, 0, 0),
              child: ListTile(
                title: Text(
                  'Choose Source',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.getFont(
                    pickerFontFamily,
                    color: textColor.withOpacity(0.65),
                    fontWeight: FontWeight.w500,
                    fontSize: 20,
                  ),
                ),
                tileColor: backgroundColor,
                dense: false,
              ),
            ),
            const Divider(),
            ListTile(
              title: Text(
                'Gallery',
                textAlign: TextAlign.center,
                style: GoogleFonts.getFont(
                  pickerFontFamily,
                  color: textColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 20,
                ),
              ),
              tileColor: backgroundColor,
              dense: false,
              onTap: () {
                Navigator.pop(context, false);
              },
            ),
            const Divider(),
            ListTile(
              title: Text(
                'Camera',
                textAlign: TextAlign.center,
                style: GoogleFonts.getFont(
                  pickerFontFamily,
                  color: textColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 20,
                ),
              ),
              tileColor: backgroundColor,
              dense: false,
              onTap: () {
                Navigator.pop(context, true);
              },
            ),
            const Divider(),
            const SizedBox(height: 10),
          ],
        );
      });
  if (fromCamera == null) {
    return null;
  }
  return selectMedia(
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    isVideo: isVideo,
    fromCamera: fromCamera,
  );
}

Future<SelectedMedia> selectMedia({
  double maxWidth,
  double maxHeight,
  bool isVideo = false,
  bool fromCamera = false,
}) async {
  final picker = ImagePicker();
  final source = fromCamera ? ImageSource.camera : ImageSource.gallery;
  final pickedMediaFuture = isVideo
      ? picker.getVideo(source: source)
      : picker.getImage(
          maxWidth: maxWidth, maxHeight: maxHeight, source: source);
  final pickedMedia = await pickedMediaFuture;
  final mediaBytes = await pickedMedia?.readAsBytes();
  if (mediaBytes == null) {
    return null;
  }
  final path = storagePath(currentUserUid, pickedMedia.path, isVideo);
  return SelectedMedia(path, mediaBytes);
}

bool validateFileFormat(String filePath, BuildContext context) {
  if (allowedFormats.contains(mime(filePath))) {
    return true;
  }
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text('Invalid file format: ${mime(filePath)}'),
    ));
  return false;
}

String storagePath(String uid, String filePath, bool isVideo) {
  final timestamp = DateTime.now().microsecondsSinceEpoch;
  // Workaround fixed by https://github.com/flutter/plugins/pull/3685
  // (not yet in stable).
  final ext = isVideo ? 'mp4' : filePath.split('.').last;
  return 'users/$uid/uploads/$timestamp.$ext';
}

void showUploadMessage(BuildContext context, String message,
    {bool showLoading = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Row(
          children: [
            if (showLoading)
              Padding(
                padding: EdgeInsets.only(right: 10.0),
                child: CircularProgressIndicator(),
              ),
            Text(message),
          ],
        ),
      ),
    );
}
