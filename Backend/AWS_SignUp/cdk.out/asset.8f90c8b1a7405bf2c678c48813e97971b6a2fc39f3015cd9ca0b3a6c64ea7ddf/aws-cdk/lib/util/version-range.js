"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rangeFromSemver = rangeFromSemver;
const semver = require("semver");
function rangeFromSemver(ver, targetType) {
    const re = ver.match(/^([^\d]*)([\d.]*)$/);
    if (!re || !semver.valid(re[2])) {
        throw new Error('not a semver or unsupported range syntax');
    }
    const prefixPart = re[1];
    const verPart = re[2];
    switch (targetType) {
        case 'bracket':
            switch (prefixPart) {
                case '':
                    // if there's no prefix and the remaining is a valid semver, there's no range specified
                    return ver;
                case '^':
                    return `[${verPart},${semver.major(verPart) + 1}.0.0)`;
                default:
                    throw new Error(`unsupported range syntax - ${prefixPart}`);
            }
        case 'pep':
            switch (prefixPart) {
                case '':
                    // if there's no prefix and the remaining is a valid semver, there's no range specified
                    return `==${ver}`;
                case '^':
                    return `>=${verPart},<${semver.major(verPart) + 1}.0.0`;
                default:
                    throw new Error(`unsupported range syntax - ${prefixPart}`);
            }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi1yYW5nZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZlcnNpb24tcmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFNQSwwQ0ErQkM7QUFyQ0QsaUNBQWlDO0FBTWpDLFNBQWdCLGVBQWUsQ0FBQyxHQUFXLEVBQUUsVUFBcUI7SUFDaEUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzNDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFDRCxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXRCLFFBQVEsVUFBVSxFQUFFLENBQUM7UUFDbkIsS0FBSyxTQUFTO1lBQ1osUUFBUSxVQUFVLEVBQUUsQ0FBQztnQkFDbkIsS0FBSyxFQUFFO29CQUNMLHVGQUF1RjtvQkFDdkYsT0FBTyxHQUFHLENBQUM7Z0JBQ2IsS0FBSyxHQUFHO29CQUNOLE9BQU8sSUFBSSxPQUFPLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDdkQ7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNoRSxDQUFDO1FBQ0gsS0FBSyxLQUFLO1lBQ1IsUUFBUSxVQUFVLEVBQUUsQ0FBQztnQkFDbkIsS0FBSyxFQUFFO29CQUNMLHVGQUF1RjtvQkFDdkYsT0FBTyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNwQixLQUFLLEdBQUc7b0JBQ04sT0FBTyxLQUFLLE9BQU8sS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsTUFBTSxDQUFDO2dCQUN4RDtvQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLENBQUM7SUFDTCxDQUFDO0FBRUgsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuXG4vLyBicmFja2V0IC0gaHR0cHM6Ly9kb2NzLm9yYWNsZS5jb20vbWlkZGxld2FyZS8xMjEyL2NvcmUvTUFWRU4vbWF2ZW5fdmVyc2lvbi5odG0jTUFWRU40MDFcbi8vIHBlcCAtIGh0dHBzOi8vd3d3LnB5dGhvbi5vcmcvZGV2L3BlcHMvcGVwLTA0NDAvI3ZlcnNpb24tc3BlY2lmaWVyc1xuZXhwb3J0IHR5cGUgUmFuZ2VUeXBlID0gJ2JyYWNrZXQnIHwgJ3BlcCdcblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlRnJvbVNlbXZlcih2ZXI6IHN0cmluZywgdGFyZ2V0VHlwZTogUmFuZ2VUeXBlKSB7XG4gIGNvbnN0IHJlID0gdmVyLm1hdGNoKC9eKFteXFxkXSopKFtcXGQuXSopJC8pO1xuICBpZiAoIXJlIHx8ICFzZW12ZXIudmFsaWQocmVbMl0pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3QgYSBzZW12ZXIgb3IgdW5zdXBwb3J0ZWQgcmFuZ2Ugc3ludGF4Jyk7XG4gIH1cbiAgY29uc3QgcHJlZml4UGFydCA9IHJlWzFdO1xuICBjb25zdCB2ZXJQYXJ0ID0gcmVbMl07XG5cbiAgc3dpdGNoICh0YXJnZXRUeXBlKSB7XG4gICAgY2FzZSAnYnJhY2tldCc6XG4gICAgICBzd2l0Y2ggKHByZWZpeFBhcnQpIHtcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHByZWZpeCBhbmQgdGhlIHJlbWFpbmluZyBpcyBhIHZhbGlkIHNlbXZlciwgdGhlcmUncyBubyByYW5nZSBzcGVjaWZpZWRcbiAgICAgICAgICByZXR1cm4gdmVyO1xuICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICByZXR1cm4gYFske3ZlclBhcnR9LCR7c2VtdmVyLm1ham9yKHZlclBhcnQpKzF9LjAuMClgO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgdW5zdXBwb3J0ZWQgcmFuZ2Ugc3ludGF4IC0gJHtwcmVmaXhQYXJ0fWApO1xuICAgICAgfVxuICAgIGNhc2UgJ3BlcCc6XG4gICAgICBzd2l0Y2ggKHByZWZpeFBhcnQpIHtcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHByZWZpeCBhbmQgdGhlIHJlbWFpbmluZyBpcyBhIHZhbGlkIHNlbXZlciwgdGhlcmUncyBubyByYW5nZSBzcGVjaWZpZWRcbiAgICAgICAgICByZXR1cm4gYD09JHt2ZXJ9YDtcbiAgICAgICAgY2FzZSAnXic6XG4gICAgICAgICAgcmV0dXJuIGA+PSR7dmVyUGFydH0sPCR7c2VtdmVyLm1ham9yKHZlclBhcnQpKzF9LjAuMGA7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCByYW5nZSBzeW50YXggLSAke3ByZWZpeFBhcnR9YCk7XG4gICAgICB9XG4gIH1cblxufVxuIl19