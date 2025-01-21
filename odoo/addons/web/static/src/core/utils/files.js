import { humanNumber } from "@web/core/utils/numbers";
import { session } from "@web/session";
import { _t } from "@web/core/l10n/translation";

const DEFAULT_MAX_FILE_SIZE = 128 * 1024 * 1024;

/**
 * @param {Services["notification"]} notificationService
 * @param {File} file
 * @param {Number} maxUploadSize
 * @returns {boolean}
 */
export function checkFileSize(fileSize, notificationService) {
    const maxUploadSize = session.max_file_upload_size || DEFAULT_MAX_FILE_SIZE;
    if (fileSize > maxUploadSize) {
        notificationService.add(
            _t(
                "The selected file (%(size)sB) is larger than the maximum allowed file size (%(maxSize)sB).",
                { size: humanNumber(fileSize), maxSize: humanNumber(maxUploadSize) }
            ),
            {
                type: "danger",
            }
        );
        return false;
    }
    return true;
}
